set -ex
echo Hi
rm -rf Terraform.app
./macapp.sh Terraform icon.png
DEST=terraform.app/Contents/MacOS
cp ../target/release/topo $DEST/Terraform
cp -r ../assets   Terraform.app/Contents/MacOS/
# git rev-parse HEAD > qmoji.app/Contents/MacOS/assets/git-head
zip -r Terraform.app.zip Terraform.app
