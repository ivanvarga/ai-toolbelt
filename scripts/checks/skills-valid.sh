#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

SKILLS_DIR="${PLUGIN_ROOT}/skills"
INVALID=()
VALID_COUNT=0

if [ ! -d "$SKILLS_DIR" ]; then
    echo "FAIL skills-valid No skills/ directory found at ${PLUGIN_ROOT}"
    exit 0
fi

for skill_dir in "$SKILLS_DIR"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name=$(basename "$skill_dir")
    skill_md="${skill_dir}SKILL.md"

    if [ ! -f "$skill_md" ]; then
        INVALID+=("$skill_name (missing SKILL.md)")
        continue
    fi

    if ! grep -q "^name:" "$skill_md" 2>/dev/null; then
        INVALID+=("$skill_name (missing name: in frontmatter)")
        continue
    fi

    VALID_COUNT=$((VALID_COUNT + 1))
done

if [ ${#INVALID[@]} -gt 0 ]; then
    echo "FAIL skills-valid Invalid skills: ${INVALID[*]}"
    exit 0
fi

if [ "$VALID_COUNT" -eq 0 ]; then
    echo "FAIL skills-valid No skill directories found in ${SKILLS_DIR}"
    exit 0
fi

echo "PASS skills-valid ${VALID_COUNT} skill(s) validated"
exit 0
