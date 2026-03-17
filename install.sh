pixi install -e forge
echo "# Added by forge installer" >> ~/.bashrc
pixi shell-hook --shell bash -e forge >> ~/.bashrc