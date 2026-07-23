#!/bin/sh

set -eu

SOURCE="${SRCROOT}/Extension/Resources"
DESTINATION="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}"
STATE_FILE="${DERIVED_FILE_DIR}/episode-roulette-resources.txt"
NEXT_STATE_FILE="${STATE_FILE}.next"

if [ ! -d "$SOURCE" ] || [ ! -f "$SOURCE/manifest.json" ]; then
  echo "error: Missing synchronized WebExtension resources at $SOURCE" >&2
  exit 1
fi

mkdir -p "$DESTINATION" "$DERIVED_FILE_DIR"

if [ -f "$STATE_FILE" ]; then
  while IFS= read -r relative_path; do
    rm -f "$DESTINATION/$relative_path"
  done < "$STATE_FILE"
fi

(cd "$SOURCE" && /usr/bin/find . -type f -print | /usr/bin/cut -c 3-) > "$NEXT_STATE_FILE"
/usr/bin/rsync -a "$SOURCE/" "$DESTINATION/"
mv "$NEXT_STATE_FILE" "$STATE_FILE"
