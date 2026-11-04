// Central de versões dos aplicativos desktop e Android.
// As versões são publicadas automaticamente pelo workflow do GitHub Actions
// sempre que houver alterações na branch principal.

export interface AppDownloadAsset {
  url: string;
  name: string;
  size?: number;
}

export interface LatestAppRelease {
  version: string;
  publishedAt: string | null;
  notes: string;
  releasePageUrl: string;
  windows: AppDownloadAsset;
  android: AppDownloadAsset;
  source: 'github' | 'fallback';
}

const GITHUB_OWNER = 'monitoramentompapiaui';
const GITHUB_REPO = 'MPA-Piaui';

const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const LATEST_RELEASE_PAGE = `${GITHUB_REPO_URL}/releases/latest`;

const WINDOWS_ASSET_NAME = 'Infopesca-Setup.exe';
const ANDROID_ASSET_NAME = 'Infopesca.apk';

const FALLBACK_WINDOWS_URL = `${LATEST_RELEASE_PAGE}/download/${WINDOWS_ASSET_NAME}`;
const FALLBACK_ANDROID_URL = `${LATEST_RELEASE_PAGE}/download/${ANDROID_ASSET_NAME}`;

interface GithubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name?: string;
  name?: string;
  body?: string;
  published_at?: string;
  html_url?: string;
  assets?: GithubReleaseAsset[];
}

export const FALLBACK_APP_RELEASE: LatestAppRelease = {
  version: 'Versão mais recente',
  publishedAt: null,
  notes: '',
  releasePageUrl: LATEST_RELEASE_PAGE,
  windows: {
    url: FALLBACK_WINDOWS_URL,
    name: WINDOWS_ASSET_NAME,
  },
  android: {
    url: FALLBACK_ANDROID_URL,
    name: ANDROID_ASSET_NAME,
  },
  source: 'fallback',
};

export async function fetchLatestAppRelease(signal?: AbortSignal): Promise<LatestAppRelease> {
  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
      cache: 'no-store',
      signal,
    });

    if (!response.ok) {
      throw new Error(`GitHub API respondeu ${response.status}`);
    }

    const release = (await response.json()) as GithubRelease;
    const assets = release.assets || [];

    const windowsAsset = assets.find(
      asset => /\.exe$/i.test(asset.name) && !/uninstaller/i.test(asset.name)
    );
    const androidAsset = assets.find(asset => /\.apk$/i.test(asset.name));

    return {
      version: release.tag_name || release.name || FALLBACK_APP_RELEASE.version,
      publishedAt: release.published_at || null,
      notes: release.body || '',
      releasePageUrl: release.html_url || LATEST_RELEASE_PAGE,
      windows: {
        url: windowsAsset?.browser_download_url || FALLBACK_WINDOWS_URL,
        name: windowsAsset?.name || WINDOWS_ASSET_NAME,
        size: windowsAsset?.size,
      },
      android: {
        url: androidAsset?.browser_download_url || FALLBACK_ANDROID_URL,
        name: androidAsset?.name || ANDROID_ASSET_NAME,
        size: androidAsset?.size,
      },
      source: 'github',
    };
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    // Mantém os links estáveis do GitHub Releases como fallback.
    // Eles sempre baixam a última versão publicada, mesmo se a API estiver indisponível.
    return FALLBACK_APP_RELEASE;
  }
}
