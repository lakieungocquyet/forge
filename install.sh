pixi workspace environment add forge

pixi task add forge "python3 main.py" --cwd ${PIXI_PROJECT_ROOT}/src/ --description "Run Forge"
echo 'alias forge="pixi run forge"' >> ~/.bashrc

pixi install -e forge
echo "# Added by forge installer" >> ~/.bashrc
pixi shell-hook --shell bash -e forge >> ~/.bashrc