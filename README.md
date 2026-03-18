# Overview
Pipeline for calling variants from whole exome sequencing (WES) raw data

This repository contains source code of Forge. The contents
of this repository are 100% open source and released under the GPL-3.0 license (see [LICENSE.TXT](https://github.com/lakieungocquyet/forge/blob/main/LICENSE)).


# Requirements
*   Unix-like operating system (cannot run on Windows)

# Installation

### Step 1: Install [pixi](https://pixi.prefix.dev/latest/)

Pixi is a package and environment management tool. Forge uses Pixi to manage dependencies and tasks.

To install pixi you can run the following command in your terminal:

```
curl -fsSL https://pixi.sh/install.sh | sh
```
If your system doesn't have "curl", you can use "wget":

```
wget -qO- https://pixi.sh/install.sh | sh
```

### Step 2: Clone Forge repository from Github

```
git clone https://github.com/lakieungocquyet/forge.git
```

### Step 3: Run installer

```
cd forge && bash install.sh
```

