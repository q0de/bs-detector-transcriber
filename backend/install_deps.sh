#!/bin/bash
set -e

# Install CPU-only PyTorch first (much smaller, faster download)
pip install --extra-index-url https://download.pytorch.org/whl/cpu torch==2.2.0+cpu

# Install rest of requirements (excluding torch to avoid reinstall)
pip install -r requirements.txt

