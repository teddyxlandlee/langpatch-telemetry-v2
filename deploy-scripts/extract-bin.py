#!/usr/bin/env python3
import zipfile
import sys

def extract_first_bin(zip_path: str, output_name: str = "geo.bin"):
    with zipfile.ZipFile(zip_path, 'r') as zf:
        bin_files = [name for name in zf.namelist() if name.lower().endswith('.bin')]
        if not bin_files:
            print("未找到 .bin 文件", file=sys.stderr)
            return False
        first_bin = bin_files[0]
        with zf.open(first_bin) as src, open(output_name, 'wb') as dst:
            dst.write(src.read())
        print(f"已提取 {first_bin} -> {output_name}")
        return True

if __name__ == "__main__":
    if len(sys.argv) == 2:
        extract_first_bin(sys.argv[1])
    elif len(sys.argv) == 3:
        extract_first_bin(sys.argv[1], sys.argv[2])
    else:
        print("Usage: extract-bin.py <zip_path> [output_name]", file=sys.stderr)
