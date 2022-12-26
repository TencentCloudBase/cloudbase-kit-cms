#!/bin/bash

# 根路径
__ABS_PATH__="$(pwd)"

cd $__ABS_PATH__
rm -rf build
mkdir build

# 打包代码
zipFunction() {
  echo "zip $1"
  cd "$__ABS_PATH__/dist"
  DEST_FILE="$__ABS_PATH__/build/$1.zip"

  rm -rf $DEST_FILE
  zip -r $DEST_FILE . -x '.DS_Store'

  cd $__ABS_PATH__
}

zipFunction dist

cd $__ABS_PATH__
