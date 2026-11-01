"""
Nex Aero - Resilient NASA C-MAPSS Dataset Acquirer & Verifier
Ensures all four required FD001 files are present and verified:
    1. train_FD001.txt
    2. test_FD001.txt
    3. RUL_FD001.txt
    4. readme.txt

Features:
- Instant local verification: If files already exist in data/raw/, zero network calls are made.
- Multi-source redundancy: Multiple public verified raw mirrors with timeout and retry backoff.
- Atomic downloads: Downloads to .tmp file before renaming to prevent corrupted partial files.
- Full integrity validation: Validates file size and line counts against official NASA standards.
"""

import os
import sys
import time
import zipfile
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "raw")

# Required FD001 dataset files with expected minimum sizes and line counts
FD001_SPECS = {
    "train_FD001.txt": {"min_bytes": 3_000_000, "min_lines": 20_000},
    "test_FD001.txt": {"min_bytes": 2_000_000, "min_lines": 13_000},
    "RUL_FD001.txt": {"min_bytes": 400, "min_lines": 100},
    "readme.txt": {"min_bytes": 1_500, "min_lines": 30},
}

# Verified public GitHub raw mirrors hosting official NASA C-MAPSS FD001 files
RAW_FILE_MIRRORS = [
    "https://raw.githubusercontent.com/edwardzjl/CMAPSSData/master/{filename}",
    "https://raw.githubusercontent.com/antoinetordeux/RUL_predict_Turbofan/main/{filename}",
    "https://raw.githubusercontent.com/mapr-demos/predictive-maintenance/master/notebooks/jupyter/Dataset/CMAPSSData/{filename}",
    "https://raw.githubusercontent.com/manan-parasher/Turbofan_Remaining_Useful_Life_Prediction/master/CMAPSSData/{filename}",
]

# ZIP archive backup mirrors
ZIP_MIRRORS = [
    "https://github.com/edwardzjl/CMAPSSData/archive/refs/heads/master.zip",
    "https://data.nasa.gov/docs/legacy/CMAPSSData.zip",
]


def verify_single_file(file_path: str, specs: dict) -> bool:
    """Checks that a single dataset file exists, has required size and line count."""
    if not os.path.isfile(file_path):
        return False
    size = os.path.getsize(file_path)
    if size < specs["min_bytes"]:
        return False
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = sum(1 for _ in f)
        return lines >= specs["min_lines"]
    except Exception:
        return False


def verify_fd001_files(target_dir: str = DATA_DIR, verbose: bool = True) -> bool:
    """Verifies that all 4 FD001 required files are present and strictly valid."""
    if not os.path.isdir(target_dir):
        return False

    all_valid = True
    if verbose:
        print(f"\n--- Verifying NASA C-MAPSS FD001 Dataset in {target_dir} ---")

    for filename, specs in FD001_SPECS.items():
        path = os.path.join(target_dir, filename)
        if not os.path.isfile(path):
            # Case-insensitive filesystem fallback
            found = False
            for actual in os.listdir(target_dir):
                if actual.lower() == filename.lower():
                    path = os.path.join(target_dir, actual)
                    found = True
                    break
            if not found:
                if verbose:
                    print(f" [MISSING] {filename:16s} (File does not exist)")
                all_valid = False
                continue

        size = os.path.getsize(path)
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            lines = sum(1 for _ in f)

        if size >= specs["min_bytes"] and lines >= specs["min_lines"]:
            if verbose:
                print(f" [OK]      {filename:16s} | Size: {size:9,d} bytes | Lines: {lines:6,d}")
        else:
            if verbose:
                print(f" [INVALID] {filename:16s} | Size: {size:9,d} bytes (expected >= {specs['min_bytes']:,}) | Lines: {lines:6,d}")
            all_valid = False

    return all_valid


def download_single_file(filename: str, specs: dict, dest_path: str) -> bool:
    """Downloads a single dataset file with multi-mirror redundancy, retries, and atomic write."""
    tmp_path = dest_path + ".tmp"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nex-Aero-Deployment/1.0"}

    for mirror_template in RAW_FILE_MIRRORS:
        url = mirror_template.format(filename=filename)
        for attempt in range(1, 4):
            print(f"   -> Fetching {filename} from {mirror_template.split('/')[3]} (attempt {attempt}/3)...")
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=30) as resp:
                    if resp.status != 200:
                        raise urllib.error.HTTPError(url, resp.status, "Non-200 status", resp.headers, None)
                    content = resp.read()

                if len(content) < specs["min_bytes"]:
                    print(f"      [WARN] Downloaded size ({len(content)} bytes) below threshold, retrying...")
                    time.sleep(1.5)
                    continue

                # Write to tmp file first
                with open(tmp_path, "wb") as f_out:
                    f_out.write(content)

                # Validate line count
                if verify_single_file(tmp_path, specs):
                    if os.path.exists(dest_path):
                        os.remove(dest_path)
                    os.rename(tmp_path, dest_path)
                    print(f"   [SUCCESS] Saved {filename} ({len(content):,d} bytes)")
                    return True
                else:
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)
                    print(f"      [WARN] Content validation failed for {filename}, trying next mirror...")
                    break
            except Exception as e:
                print(f"      [RETRY] Failed from {url}: {e}")
                time.sleep(attempt * 2)

    return False


def download_from_zip(target_dir: str) -> bool:
    """Fallback: Downloads a ZIP archive of CMAPSSData and extracts required files."""
    zip_dest = os.path.join(target_dir, "CMAPSSData_download.zip")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nex-Aero-Deployment/1.0"}

    for zip_url in ZIP_MIRRORS:
        print(f"\nAttempting ZIP fallback download from: {zip_url}")
        for attempt in range(1, 3):
            try:
                req = urllib.request.Request(zip_url, headers=headers)
                with urllib.request.urlopen(req, timeout=45) as resp, open(zip_dest, "wb") as f_out:
                    f_out.write(resp.read())

                print("Extracting ZIP contents...")
                with zipfile.ZipFile(zip_dest, "r") as zf:
                    for member in zf.namelist():
                        basename = os.path.basename(member)
                        if basename in FD001_SPECS:
                            source = zf.open(member)
                            target = open(os.path.join(target_dir, basename), "wb")
                            with source, target:
                                target.write(source.read())
                            print(f" - Extracted: {basename}")

                if os.path.exists(zip_dest):
                    os.remove(zip_dest)

                if verify_fd001_files(target_dir, verbose=False):
                    print("[SUCCESS] All FD001 files successfully extracted from ZIP archive.")
                    return True
            except Exception as e:
                print(f"ZIP download attempt {attempt} failed: {e}")
                time.sleep(2)

    if os.path.exists(zip_dest):
        os.remove(zip_dest)
    return False


def download_and_extract(target_dir: str = DATA_DIR) -> bool:
    """
    Main acquisition entry point.
    1. Checks if all 4 FD001 files already exist and are valid (zero network calls if verified).
    2. Downloads any missing files individually from redundant raw mirrors.
    3. Falls back to ZIP archive extraction if individual downloads fail.
    4. Performs final full verification.
    """
    os.makedirs(target_dir, exist_ok=True)

    # 1. Check if already present and valid locally
    if verify_fd001_files(target_dir, verbose=True):
        print("\nAll 4 required NASA FD001 files are already present and verified. Zero download required!")
        return True

    print("\nDataset files missing or incomplete. Initiating robust multi-source acquisition...")

    # 2. Download missing files individually
    missing_files = []
    for filename, specs in FD001_SPECS.items():
        path = os.path.join(target_dir, filename)
        if not verify_single_file(path, specs):
            missing_files.append((filename, specs, path))

    print(f"Missing {len(missing_files)} file(s): {[f[0] for f in missing_files]}")
    for filename, specs, dest_path in missing_files:
        success = download_single_file(filename, specs, dest_path)
        if not success:
            print(f"[FAIL] Could not acquire {filename} via raw mirrors. Switching to ZIP fallback...")
            download_from_zip(target_dir)
            break

    # 3. Final verification
    return verify_fd001_files(target_dir, verbose=True)


if __name__ == "__main__":
    ok = download_and_extract()
    sys.exit(0 if ok else 1)
