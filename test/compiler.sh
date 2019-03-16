set -euo pipefail

count=0

d=${0%/*}
test -d "$d"
mkdir -p "$d/run"
decoy () { node "$d"/../src/main.js "$@"; }
for test in "$d"/compiler/*.decoy; do
    name=$(basename "$test" .decoy)
    out=$d/run/$name
    decoy -c "$test" > "$out.js"
    node "$out.js" > "$out.out"
    decoy "$test" > "$out.interp"
    diff "$out.interp" "$out.out"
    count=$[count+1]
done

echo "compiler: $count passed"
