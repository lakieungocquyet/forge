SCRIPT_DIR_PATH="$(dirname "$(realpath $0)")"

rm -rf "$SCRIPT_DIR_PATH/.pixi"
rm -f pixi.toml
rm -f pixi.lock

# sed -i '/>>> forge shell hook >>>/,/<<< forge shell hook <<</d' ~/.bashrc
sed -i '/>>> added by forge installer >>>/,/<<< added by forge installer <<</d' ~/.bashrc

