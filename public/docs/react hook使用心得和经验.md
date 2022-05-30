---
title: 'react hook使用心得和经验'
date: '20220401'
tag: 'tech'
---
# react hook使用心得和经验

## 前言

最近在一个中后台平台中，重构了一个比较散乱的子项目，起初本打算在其中一部分内容中，应用自己制作的json schema生产表单的工具，最后源于复杂度原因，遂最后仍然用手写组件的形式完成。因为自己在做活动大部分都是使用vue，相反对react 使用度并不是很高，这回重构严格上说自己只有7个工作日（因为前10个工作日都在做表单配置工具），时间紧任务重，好在先捋清楚思路后，才开始动手的，整体过程中没有太多困难，最后也是赶着时间点顺利地完成了。这回也算是提高了自己对react的使用，这里总结一下自己在这回项目中一些对最常用的几个react hook的使用经验和心得。

## useCallback

useCallback算是自己在用的过程中遇到过坑最大的一个了。

useCallback会接受两个参数，第一个为需要缓存的函数，第二个为依赖数组。每次函数组件渲染，如果依赖数组内的依赖项没有发生变化，那么就返回上一次之前缓存了的函数。如下图所示，第一次这个Preview渲染时，func被赋为了useCallback内的第一个参数。之后Preview再次被渲染，因为useCallback内的依赖数组为空，func始终使用的是第一次缓存了的那个函数，其中的这个函数的引用的state，也是第一次渲染Preview组件时产生的闭包里的state,也就是0（因为函数组件的渲染本质就是执行函数，可以理解为Preview更新渲染100次，就是执行100次Preview函数）

```jsx
const Preview = (props) => {
  const [state,setState] = useState(0)
  const func = useCallback(() => {
    console.log(state);
  },[]) //[state]这样就能每次更新了state后，就能更新func
  return (
    <div>
      {state}
      <button onClick={() =>{setState((pre) => pre + 1)}}>add</button>
      <div onClick={func} className={'rect'}></div>
      {/* <Editor/> */}
    </div>
  )
}
```

其实按照社区的说法，大部分的应用其实都并不需要useCallback,并且大多数情况弊大于利，上述这种是场景比较简单，如果场景复杂变量一多，发生了错误就非常难以排查。

## useEffect

useEffect相对来说比较简单，接受一个effect函数，以及相关的依赖项数组，每次组件第一次渲染时都会执行effect，之后的渲染更新是否则会执行effect，则根据依赖项是否发生变化，如若想在组件卸载时或者更新前提供clean effect，其可定义在effect函数的返回里。useEffect目的本质是为了将之前的class component 生命周期的componentDidMount，componentDidUpdate和componentWillUnmount三者结合起来，一个函数搞定。 然而这么多功能的一个函数，却有时候完不成一个单独的更新时才起到effect功能，因此我们需要单独封装一个useUpdateEffect

```jsx
const useUpdateEffect: typeof useEffect = (effect,dep) => {
//利用useRef,来判断是否是第一次渲染，若是第一次就跳过。
  const ref = useRef(false)
  useEffect(() => {
    if(ref.current === false){
      ref.current = true
    }else{
      effect()
    }
  },dep)
}
```

## useState

useState的整体理解思路其实与之前class component的state和setState相似，功能上并没有太大的差异。只是变成了hook的形式。其返回一个数组，第一个数组值为state,第二个值为setState。setState的使用其实按照之前class component来就行。需要注意的是，所有本轮事件循环中出现的setState，会统一放到一个数组里，进入微任务队列，之后等当前执行栈结束，遍历数组，结束后，再渲染组件。因此像下面这种，循环结束后，state里的num仍然只会是1

```jsx
class App extends React.Component {
    constructor() {
        super();
        this.state = {
            num: 0
        }
    }
    componentDidMount() {
        for ( let i = 0; i < 100; i++ ) {
            this.setState(
                // console.log( prevState.num );
                {
                    num: this.state.num + 1
                }
            );
        }
    }
    componentDidUpdate() {
        console.log( 'update' )
    }
    render() {
        return ( <div className='App'>
            <h1>{this.state.num}</h1>
        </div> );
    }
}
```

然而若将componentDidMount内的换成下面所示，则会最终num变成100.

```jsx
    componentDidMount() {
        for ( let i = 0; i < 100; i++ ) {
						this.setState( prevState => {
                // console.log( prevState.num );
                return {
                    num: prevState.num + 1
                }
            } );
        }
    }
```

其本质是因为setState接受两种参数形式，一种是state对象，另一种是形参和返回都是state对象的一个函数。setState会对接收到两种不同参数，做出不一样的操作逻辑。

```jsx
while ( item = setStateQueue.shift() ) {
        const { stateChange, component } = item;
        // 如果没有prevState，则将当前的state作为初始的prevState
        if ( !component.prevState ) {
            component.prevState = Object.assign( {}, component.state );
        }
        // 如果stateChange是一个方法，也就是setState的第二种形式
        if ( typeof stateChange === 'function' ) {
            Object.assign( component.state, stateChange( component.prevState, component.props ) );
        } else {
            // 如果stateChange是一个对象，则直接合并到setState中
            Object.assign( component.state, stateChange );
        }
        component.prevState = component.state;
    }
```

上面是一个分析了react源码的一位[开源文章](https://github.com/hujiulong/blog/issues/6)作者写的简易版伪代码，个人认为分析的不错，就贴出来了。上面的这个while循环就是在不停地做遍历存放了同一个但在一次事件循环中被多次执行的setState的数组，取出每个setState进行操作，对component的prevState设置为当前的state,为之后做准备。如果发现是一个方法，就把当前的component.state 赋值为方法执行完后的返回值（也就是代码中的stateChange( component.prevState, component.props ))。如果是一个对象，则直接把当前component.state赋值为当前对象。我们可以很好的分析得到，如果只是传对象，那么每次遍历，本质上数据是不会关联的，下一次的遍历或完全覆盖上一次的数据。如果传了对象，每次循环利用了preState这个变量值，得到上一次的结果，下一次就能够起到对上一次的累加作用。