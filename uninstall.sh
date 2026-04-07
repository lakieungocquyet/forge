SCRIPT_DIR_PATH="$(dirname "$(realpath $0)")"

rm -rf "$SCRIPT_DIR_PATH/.pixi"
rm -f "$SCRIPT_DIR_PATH/pixi.toml"
rm -f "$SCRIPT_DIR_PATH/pixi.lock"

pixi global uninstall forge

sed -i '/>>> forge shell hook >>>/,/<<< forge shell hook <<</d' ~/.bashrc
sed -i '/>>> added by forge installer >>>/,/<<< added by forge installer <<</d' ~/.bashrc

