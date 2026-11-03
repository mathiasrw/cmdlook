#!/usr/bin/env bash

# End to end tests of cmdlook. Runs on Node by default. Set RUNNER to use another runtime, like RUNNER=bun or a path to an older node.

ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
CL="${RUNNER:-node} $ROOT/index.js"
DATA="$ROOT/test/data"
FAILED=0
COUNT=0

check() { # check <name> <expected> <actual>
	COUNT=$((COUNT + 1))
	if [ "$2" != "$3" ]; then
		FAILED=$((FAILED + 1))
		printf 'FAIL %s\n  expected %q\n  got      %q\n' "$1" "$2" "$3"
	fi
}

# Fresh test data before each test
reset() {
	cd "$ROOT"; rm -rf "$DATA"; mkdir -p "$DATA/sub/deeper"; cd "$DATA"
	echo a > A.file; echo b > B.file; echo c > sub/C.file; echo d > sub/deeper/D.file
	echo e > '[x].md'; echo f > 'star*.txt'
}

# start <cmdlook args...> starts cmdlook in the background and gives it time to start watching.
# Set WAIT to give it more time on a slow machine.
start() { $CL "$@" > ../out 2> ../err & PID=$!; sleep "${WAIT:-0.8}"; }

# stop gives the last run time to finish, then stops cmdlook
stop() { sleep 0.5; kill $PID 2>/dev/null; wait $PID 2>/dev/null; }

out() { cat ../out; }

# A first start can be slow, like under Rosetta, so get it done before the tests
$CL > /dev/null 2>&1

echo "cmdlook tests with ${RUNNER:-node} $(${RUNNER:-node} --version)"

reset; start . echo ran; echo x >> sub/deeper/D.file; stop
check 'a folder is watched with its subfolders' 'ran' "$(out)"

reset; start 'sub/**/*.file' 'echo {{x}} ran'; echo x >> sub/deeper/D.file; stop
check 'a glob is watched' '{{x}} ran' "$(out)"

reset; start '*.file' echo ran; echo x >> sub/C.file; stop
check 'a glob leaves other files out' '' "$(out)"

reset; start A.file echo ran; echo x >> A.file; stop
check 'a file is watched' 'ran' "$(out)"

reset; start A.file echo ran; echo x >> B.file; stop
check 'a file leaves the files next to it out' '' "$(out)"

reset; start '[x].md' echo ran; echo x >> '[x].md'; stop
check 'a file with [ ] in its name is used as it is' 'ran' "$(out)"

reset; start 'star*.txt' echo ran; echo x >> 'star*.txt'; stop
check 'a file with * in its name is used as it is' 'ran' "$(out)"

reset; start A.file echo ran; echo saved > .tmp && mv .tmp A.file; stop
check 'a file saved by renaming a new file over it' 'ran' "$(out)"

reset; start A.file echo 'two  words' "it's"; echo x >> A.file; stop
check 'several arguments keep their quoting' "two  words it's" "$(out)"

reset; start A.file 'echo one && echo two'; echo x >> A.file; stop
check 'one argument is a shell command' $'one\ntwo' "$(out)"

reset; start A.file echo ran; echo 1 >> A.file; echo 2 >> A.file; echo 3 >> A.file; stop
check 'a few quick writes give one run' 'ran' "$(out)"

reset; start . 'echo ran; sleep 0.5'; echo x >> A.file; sleep 0.2; echo x >> B.file; sleep 0.1; echo x >> A.file; sleep 0.6; stop
check 'changes during a run give one more run' $'ran\nran' "$(out)"

reset
$CL '*.nope' echo ran 2> ../err; check 'a glob with no match is an error' '1' "$?"
check 'and says so' "Error: No files found matching pattern '*.nope'." "$(cat ../err)"
$CL nope.file echo ran 2> ../err; check 'a target that is not a file or folder is a glob' "Error: No files found matching pattern 'nope.file'." "$(cat ../err)"
$CL A.file 2> /dev/null; check 'no command is an error' '1' "$?"

cd "$ROOT"; rm -rf "$DATA" test/out test/err
echo "$((COUNT - FAILED)) of $COUNT passed"
[ $FAILED -eq 0 ]
