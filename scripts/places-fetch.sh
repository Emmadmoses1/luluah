#!/usr/bin/env sh
# Downloads GeoNames data (CC BY 4.0) into data/geonames. Needs: curl, unzip.
set -u
DIR="data/geonames"; BASE="https://download.geonames.org/export"
mkdir -p "$DIR"
command -v curl >/dev/null || { echo "Install curl:  pkg install curl"; exit 1; }
command -v unzip >/dev/null || { echo "Install unzip: pkg install unzip"; exit 1; }
fetch_zip() { # url, expected txt name
  if curl -fsSL --retry 3 -o "$DIR/tmp.zip" "$1"; then
    unzip -o -q "$DIR/tmp.zip" "$2" -d "$DIR" && echo "ok      $2" || echo "FAILED  unzip $2"
  else echo "missing $2 (not published at $1)"; fi
  rm -f "$DIR/tmp.zip"
}
fetch_zip "$BASE/dump/cities1000.zip" cities1000.txt
curl -fsSL --retry 3 -o "$DIR/admin1CodesASCII.txt" "$BASE/dump/admin1CodesASCII.txt" && echo "ok      admin1CodesASCII.txt" || echo "missing admin1CodesASCII.txt"
for c in BH SA AE KW QA OM YE IQ JO PS LB SY EG SD LY TN DZ MA MR SO DJ KM; do
  fetch_zip "$BASE/zip/$c.zip" "$c.txt"
done
echo "Done. Next: npm run places:import"
