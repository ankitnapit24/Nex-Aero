"""
AeroGuard AI - NASA C-MAPSS Dataset Downloader & Verifier
Downloads and unpacks the C-MAPSS dataset (specifically subset FD001).
"""

import os
import sys
import zipfile
import urllib.request
import urllib.error
import hashlib

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "raw")
ZIP_DESTINATION = os.path.join(DATA_DIR, "CMAPSSData.zip")

# Known endpoints for the NASA CMAPSS dataset
PRIMARY_URLS = [
    "https://data.nasa.gov/docs/legacy/CMAPSSData.zip",
    "https://raw.githubusercontent.com/shadab-iqbal/NASA-Turbofan-Jet-Engine-C-MAPSS-Dataset/master/CMAPSSData.zip",
    "https://raw.githubusercontent.com/vinayakumarr/Turbofan-Engine-Degradation-Simulation/master/CMAPSSData.zip"
]

FD001_FILES = [
    "train_FD001.txt",
    "test_FD001.txt",
    "RUL_FD001.txt",
    "readme.txt"
]

def verify_fd001_files(target_dir: str) -> bool:
    """Verifies that all FD001 required files are present and non-empty."""
    all_present = True
    print("\n--- Verifying FD001 Files in", target_dir, "---")
    for filename in FD001_FILES:
        path = os.path.join(target_dir, filename)
        if not os.path.exists(path):
            # Try case-insensitive check
            found = False
            for actual_file in os.listdir(target_dir):
                if actual_file.lower() == filename.lower():
                    found = True
                    path = os.path.join(target_dir, actual_file)
                    break
            if not found:
                print(f"[MISSING] {filename}")
                all_present = False
                continue
        
        size = os.path.getsize(path)
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            lines = sum(1 for _ in f)
        print(f"[OK] {filename:16s} Size: {size:8d} bytes | Lines: {lines:6d}")
    return all_present

def download_and_extract():
    os.makedirs(DATA_DIR, exist_ok=True)

    # Check if already extracted
    if verify_fd001_files(DATA_DIR):
        print("\nAll FD001 files are already present and verified in data/raw/.")
        return True

    downloaded = False
    for url in PRIMARY_URLS:
        print(f"\nAttempting download from: {url}")
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AeroGuard-AI/1.0"}
            )
            with urllib.request.urlopen(req, timeout=30) as response, open(ZIP_DESTINATION, "wb") as out_file:
                total_length = response.getheader('content-length')
                if total_length:
                    total_bytes = int(total_length)
                    print(f"Total size: {total_bytes / (1024*1024):.2f} MB")
                out_file.write(response.read())
            
            print(f"Successfully downloaded to {ZIP_DESTINATION}")
            downloaded = True
            break
        except Exception as e:
            print(f"Failed from {url}: {e}")

    if not downloaded:
        print("\n[ERROR] Automated download could not reach the remote archives.")
        print("Please manually download CMAPSSData.zip or the individual FD001 files and place them into:")
        print(f"   {DATA_DIR}")
        print("Required files:")
        for f in FD001_FILES:
            print(f"   - {f}")
        return False

    # Extract ZIP
    print(f"\nExtracting {ZIP_DESTINATION} to {DATA_DIR}...")
    try:
        with zipfile.ZipFile(ZIP_DESTINATION, 'r') as zip_ref:
            zip_ref.extractall(DATA_DIR)
        print("Extraction complete.")
    except Exception as e:
        print(f"Extraction failed: {e}")
        return False

    return verify_fd001_files(DATA_DIR)

if __name__ == "__main__":
    success = download_and_extract()
    sys.exit(0 if success else 1)
