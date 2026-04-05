#!/usr/bin/env bash
WORKFLOW_DIR="$HOME/.claude/get-shit-done/workflows"
PASS=0; FAIL=0; SKIP=0

check() {
  local file="$1" marker="$2" name="$3"
  if [ ! -f "$WORKFLOW_DIR/$file" ]; then
    echo "SKIP $name: $file not found"
    ((SKIP++))
    return
  fi
  if grep -q "$marker" "$WORKFLOW_DIR/$file"; then
    echo "PASS $name"
    ((PASS++))
  else
    echo "FAIL $name: patch not applied"
    ((FAIL++))
  fi
}

check "new-project.md" "TB_PATCH: forgetful-project-context" "new-project"
check "new-milestone.md" "TB_PATCH: forgetful-milestone-context" "new-milestone"
check "discuss-phase.md" "TB_PATCH: forgetful-discuss-context" "discuss-phase"
check "plan-phase.md" "TB_PATCH: forgetful-plan-context" "plan-phase"
check "complete-milestone.md" "TB_PATCH: forgetful-milestone-save" "complete-milestone"
check "research-phase.md" "TB_PATCH: forgetful-research-context" "research-phase"
check "research-phase.md" "TB_PATCH: research-general-discoveries" "research-discoveries"

echo ""
echo "$PASS passed, $FAIL failed, $SKIP skipped"
[ "$FAIL" -eq 0 ] || exit 1
