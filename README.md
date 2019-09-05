node rchain.js

## 趣味编程
在所有代码的return语句前加一行打印retuan之前一行代码的代码+文件名+行号。
例如：
原来的代码：
```
// test.js
function test(){
  const int i=10;
  return;
}
```
替换后应该是：
```
function test(){
  const int i=10;
  conole.log('const int i=10, at test.js:3')
  return;
}
```

实际打印语句由不同语言决定。

## 调试应用例子
例子：
https://github.com/fanfeilong/rchain/rchain.js

执行: node rchain.js
输出：替换后的return语句，在vscode下可以ctrl+鼠标点击跳转


![](https://github.com/fanfeilong/rchain/blob/master/img/hello.png)

## 简单需求升级：
打印return前一行非空代码