"""
GitHub Collector -- збір активності розробників на GitHub.
Використовує GitHub REST API з автентифікацією через Personal Access Token.
Працює лише для криптовалютних активів.
"""
import requests
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import GitHubStats, Asset
from app.config import settings

# Маппінг тікерів до відомих репозиторіїв
# Використовується щоб уникнути пошук по API і мінімізувати запити
KNOWN_REPOS = {
    "BTC-USD":  ["bitcoin/bitcoin"],
    "ETH-USD":  ["ethereum/go-ethereum", "ethereum/solidity"],
    "BNB-USD":  ["bnb-chain/bsc"],
    "SOL-USD":  ["solana-labs/solana"],
    "XRP-USD":  ["XRPLF/rippled"],
    "ADA-USD":  ["input-output-hk/cardano-node"],
    "DOGE-USD": ["dogecoin/dogecoin"],
    "DOT-USD":  ["paritytech/polkadot"],
    "MATIC-USD":["maticnetwork/bor"],
    "AVAX-USD": ["ava-labs/avalanchego"],
    "LINK-USD": ["smartcontractkit/chainlink"],
    "UNI-USD":  ["Uniswap/v3-core"],
    "LTC-USD":  ["litecoin-project/litecoin"],
    "ATOM-USD": ["cosmos/cosmos-sdk"],
    "FIL-USD":  ["filecoin-project/lotus"],
}

ACTIVITY_THRESHOLDS = {
    "high":   100,  # 100+ комітів за місяць
    "medium":  10,  # 10-99 комітів за місяць
    # менше 10 -- low
}


class GitHubCollector:
    """
    Збирач активності розробників на GitHub для криптовалютних активів.
    Використовує автентифіковані запити щоб отримати
    60 запитів/годину -> 5000 запитів/годину.
    """

    BASE_URL = "https://api.github.com"

    def __init__(self):
        self.token = getattr(settings, "GITHUB_TOKEN", None)
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })
        if self.token:
            self.session.headers["Authorization"] = f"Bearer {self.token}"

    def _get_commits_count(self, owner: str, repo: str) -> int:
        """
        Отримує кількість комітів за останній місяць.
        Використовує GitHub commits API з фільтром по даті.
        """
        try:
            since = (datetime.utcnow() - timedelta(days=30)).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )
            url = f"{self.BASE_URL}/repos/{owner}/{repo}/commits"
            params = {
                "since": since,
                "per_page": 100,
            }

            response = self.session.get(url, params=params, timeout=10)

            if response.status_code == 409:
                # Репозиторій порожній
                return 0

            if response.status_code != 200:
                return 0

            commits = response.json()
            return len(commits) if isinstance(commits, list) else 0

        except Exception:
            return 0

    def _get_repo_stats(self, repo_full_name: str) -> dict | None:
        """
        Отримує статистику конкретного репозиторію.
        repo_full_name: наприклад "bitcoin/bitcoin"
        """
        try:
            url = f"{self.BASE_URL}/repos/{repo_full_name}"
            response = self.session.get(url, timeout=10)

            if response.status_code != 200:
                return None

            data = response.json()
            owner, repo = repo_full_name.split("/", 1)
            commits = self._get_commits_count(owner, repo)

            # Визначаємо рівень активності
            if commits >= ACTIVITY_THRESHOLDS["high"]:
                activity_level = "high"
            elif commits >= ACTIVITY_THRESHOLDS["medium"]:
                activity_level = "medium"
            else:
                activity_level = "low"

            return {
                "repo_name": data.get("full_name", repo_full_name),
                "repo_url": data.get("html_url", ""),
                "stars": data.get("stargazers_count", 0),
                "forks": data.get("forks_count", 0),
                "open_issues": data.get("open_issues_count", 0),
                "commits_last_month": commits,
                "activity_level": activity_level,
            }

        except Exception:
            return None

    def _search_repos(self, ticker: str, asset_name: str) -> list[str]:
        """
        Шукає репозиторії через GitHub Search API.
        Використовується для тікерів яких немає у KNOWN_REPOS.
        """
        try:
            clean_ticker = ticker.replace("-USD", "").replace("-USDT", "")
            query = asset_name if asset_name and asset_name != ticker else clean_ticker

            url = f"{self.BASE_URL}/search/repositories"
            params = {
                "q": f"{query} cryptocurrency blockchain",
                "sort": "stars",
                "order": "desc",
                "per_page": 5,
            }

            response = self.session.get(url, params=params, timeout=10)

            if response.status_code != 200:
                return []

            data = response.json()
            items = data.get("items", [])
            return [item["full_name"] for item in items[:5]]

        except Exception:
            return []

    def collect(self, ticker: str, asset_name: str = "") -> list[dict]:
        """
        Збирає статистику GitHub для криптовалютного активу.
        Спочатку перевіряє KNOWN_REPOS, потім шукає через API.
        """
        ticker_upper = ticker.upper().strip()

        # Перевіряємо відомі репозиторії
        repo_names = KNOWN_REPOS.get(ticker_upper)

        # Якщо немає у відомих -- шукаємо через API
        if not repo_names:
            repo_names = self._search_repos(ticker_upper, asset_name)

        if not repo_names:
            return []

        results = []
        for repo_full_name in repo_names[:5]:
            stats = self._get_repo_stats(repo_full_name)
            if stats:
                results.append(stats)

        return results

    def collect_and_save(
        self,
        ticker: str,
        asset: Asset,
        db: Session
    ) -> list[GitHubStats]:
        """
        Збирає статистику та зберігає у базу даних.
        Повертає список збережених записів GitHubStats.
        """
        if asset.asset_type != "crypto":
            return []

        raw_stats = self.collect(ticker, asset.name)

        if not raw_stats:
            return []

        saved = []
        for stat in raw_stats:
            existing = db.query(GitHubStats).filter(
                GitHubStats.asset_id == asset.id,
                GitHubStats.repo_name == stat["repo_name"]
            ).first()

            if existing:
                # Оновлюємо існуючий запис
                existing.stars = stat["stars"]
                existing.forks = stat["forks"]
                existing.open_issues = stat["open_issues"]
                existing.commits_last_month = stat["commits_last_month"]
                existing.activity_level = stat["activity_level"]
                existing.recorded_at = datetime.utcnow()
                saved.append(existing)
            else:
                github_stat = GitHubStats(
                    asset_id=asset.id,
                    repo_name=stat["repo_name"],
                    repo_url=stat["repo_url"],
                    stars=stat["stars"],
                    forks=stat["forks"],
                    open_issues=stat["open_issues"],
                    commits_last_month=stat["commits_last_month"],
                    activity_level=stat["activity_level"],
                )
                db.add(github_stat)
                saved.append(github_stat)

        db.commit()
        return saved

    def get_cached_or_fetch(
        self,
        ticker: str,
        asset: Asset,
        db: Session
    ) -> list[GitHubStats]:
        """
        Повертає кешовані дані якщо вони свіжі (менше 24 годин),
        інакше збирає нові (мінімізація запитів).
        """
        if asset.asset_type != "crypto":
            return []

        cutoff = datetime.utcnow() - timedelta(hours=24)

        cached = db.query(GitHubStats).filter(
            GitHubStats.asset_id == asset.id,
            GitHubStats.recorded_at >= cutoff
        ).all()

        if cached:
            return cached

        return self.collect_and_save(ticker, asset, db)