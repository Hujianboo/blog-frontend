# react hooks 实现（一）

Created: February 4, 2023 10:10 PM

源码地址: [https://github.com/Hujianboo/react-replica](https://github.com/Hujianboo/react-replica)

在我们使用 react hook 的时候，比如 useState,在 mounted 和 update 时，其实是两个来自不同的集合。这个集合我们可以称为 Dispatcher,类型定义如下

```tsx
export interface Dispatcher {
  useState: <T>(initialState: (() => T) | T) => [T, Dispatch<T>];
  useRef: xxx;
  useEffect: xxxx;
}
```

在使用 React 的过程中，我们并不需要关心使用的是哪一个集合里的 hook,因为在 beginWork 的阶段向下生成 Fiber 节点过程中，有相关逻辑判别此类问题

```tsx
export const beginWork = (wip: FiberNode) => {
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip);
    case HostComponent:
      return updateHostComponent(wip);
    case HostText:
      return null;
    case FunctionComponent:
      return updateFunctionComponent(wip);
    default:
      break;
  }
  return null;
};
function updateFunctionComponent(wip: FiberNode) {
  const nextChildren = renderWithHooks(wip);
  reconcileChildren(wip, nextChildren);
  return wip.child;
}
```

renderWithHooks 函数其内部会根据 wip 节点是否存在 current 来判定当前是处于 mount 阶段还是 update 阶段，因此我们在使用的过程中无需考虑这些情况。在 renderwithHooks 中 ，我们会同时执行函数组件的函数体，执行其中的 hook 函数，返回内部 ReactElement 给 beginWork，用于继续向下生成 Fiber 节点。

```tsx
export function renderWithHooks(wip: FiberNode) {
  // 赋值操作
  currentlyRenderingFiber = wip;
  // 重置
  wip.memoizedState = null;

  const current = wip.alternate;

  if (current !== null) {
    // update
  } else {
    // mount
    // currentDispatcher即为当前的hook使用集合，这里赋值为Mount集合
    currentDispatcher.current = HooksDispatcherOnMount;
  }

  const Component = wip.type;
  const props = wip.pendingProps;
  // 执行函数组件，并返回内部的ReactElement,其中也会一并执行相关的hooks函数
  const children = Component(props);

  // 重置操作
  currentlyRenderingFiber = null;
  return children;
}
```

因为在 renderWithHooks 过程中，已经将当前的 hook 使用集合指定完毕，所以在执行 hook 函数过程中，就会使用 mount hooks 集合，比如说我们使用的是 useState，它实际会使用 mountState 函数，其内部逻辑就是首先拿到当前 Fiber 节点对应的第一个 hook(这里都只考虑都为 useState）。之后对 initailState 进行判断做出对应逻辑操作作为当前的计算状态，并且存于 hook 的 memoizedState 中，useState 返回的 Dispatch 方法能够触发更新，因此还要创建一个更新队列存于 hook 中并且返回方法也要关联上重新渲染。

```tsx
function mountState<T>(initialState: (() => T) | T): [State, Dispatch<T>] {
  const hook = mountWorkInProgressHook();
  let memoizedState;
  if (initialState instanceof Function) {
    memoizedState = initialState();
  } else {
    memoizedState = initialState;
  }
  debugger;
  //为后续更新做准备
  const queue = createUpdateQueue<State>();
  hook.updateQueue = queue;
  hook.memoizedState = memoizedState;
  // 使用bind指定fiber节点和更新队列
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  queue.dispatch = dispatch;
  return [memoizedState, dispatch];
}
function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>
) {
  const update = createUpdate(action);
  enqueueUpdate(updateQueue, update);
  //重新开始渲染fiber树
  scheduleUpdateOnFiber(fiber);
}
```

整体的结构就是如下所示：

![未命名文件33.png](<../react_hooks_achievement(1)/hooks_struct.png>)

每个 Fiber 内部的 hook 和数据存储情况如下所示：

![未命名文件(99).png](<../react_hooks_achievement(1)/fiber_struct.png>)

根据上图，我们在创建 hook 中，就可以根据上面的情况，判断当前全局变量 workInProgressWork 的情况来做出选择

```tsx
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
  };
  //第一个hook
  if (workInProgressHook === null) {
    // 全局currentlyRenderingFiber不存在，说明没有经过renderWithHooks阶段,即说明没在functioncomponent中使用Hook
    if (currentlyRenderingFiber === null) {
      throw new Error("hook not used in function component");
    } else {
      workInProgressHook = hook;
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    // 之前已有Hook，挂到尾部。
    workInProgressHook.next = hook;
    workInProgressHook = hook;
  }
  return workInProgressHook;
}
```

我们在 demo 中实验一下、

```tsx
import React from "react";
import { ReactElementType } from "shared/ReactTypes";
import ReactDom from "react-dom/client";
import { useState } from "react";
const App = () => {
  const [num, setNum] = useState(10000);
  const [num1, setNum1] = useState(100086);
  return (
    <p>
      <span>
        <h1>{num + " " + num1.toString()}</h1>
      </span>
    </p>
  );
};

const element = document.getElementById("root");
ReactDom.createRoot(element as Element).render((<App />) as ReactElementType);
```

并且在对应创建 hook 的地方打上断点，结果如下所示

![WechatIMG141.jpeg](<../react_hooks_achievement(1)/WechatIMG141.jpeg>)

可以看到正常的渲染出了对应的结果，并且可以在 debugger 断点处知道我们在挂载第二个 useState 时正常创建并且指针后移成功，说明逻辑正确。

![WechatIMG142.jpeg](<../react_hooks_achievement(1)/WechatIMG142.jpeg>)

![WechatIMG143.jpeg](<../react_hooks_achievement(1)/WechatIMG143.jpeg>)
