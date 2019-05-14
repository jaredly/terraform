set -ex
echo Hi
rm -rf terraform.app
./macapp.sh terraform icon.png
DEST=terraform.app/Contents/MacOS
cp ../target/release/topo $DEST/terraform
# cp -r ../assets   terraform.app/Contents/MacOS/
# git rev-parse HEAD > qmoji.app/Contents/MacOS/assets/git-head
zip -r terraform.zip terraform.app