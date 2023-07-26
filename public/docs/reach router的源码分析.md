---
title: "reach router的源码分析"
date: "20230726"
tag: "tech"
---

# reach router 的源码分析

Created: July 25, 2023 11:11 AM

## 前言

reach router 是一个常用的 react 的路由库。

它的实现原理并不复杂，主要是依赖 html5 的 window.history 的 pushState 和 replaceState 两个 api，因为他们能改变 history 内部的历史栈但是又能够不刷新页面。其使用了观察者模式，当用户通过其内置方法改变路由时，它会将对应监听的 listener 函数执行，listener 是个重置 react 组件状态的函数，从而实现组件重新渲染，以此达成无刷新页面但是能够更新页面的功能。当用户输入 url 进入页面时，其会解析当前对应的路径，并从当前的路由组件中找出匹配的组件渲染。

其实 reach router 的源码并不多，总计的有效也就 1000 多行，它仍然使用的是 legacy 版本的 react 编写，其实我们完全可以自己实现一个 react hook 版本的 reach router。

## 解析

官方源码有主要三个文件，index.js, history.js 和 utils.js

### history.js

该文件用来存放关于 history 相关的库，最重要的是 createHistory 其会创建一个全局对象，并且提供 navigate 和 listen 方法，一个用来跳转，一个用来存放监听函数,代码比较简单具体可以看代码注释。

```jsx
let createHistory = (source, options) => {
  let listeners = [];
  let location = getLocation(source);
  let transitioning = false;
  let resolveTransition = () => {};

  return {
    get location() {
      return location;
    },

    get transitioning() {
      return transitioning;
    },

    _onTransitionComplete() {
      transitioning = false;
      resolveTransition();
    },

    listen(listener) {
      // 监听事件函数，LocationProvider每次初始化时都会监听。
      listeners.push(listener);

      let popstateListener = () => {
        location = getLocation(source);
        listener({ location, action: "POP" });
      };

      source.addEventListener("popstate", popstateListener);

      return () => {
        source.removeEventListener("popstate", popstateListener);
        listeners = listeners.filter((fn) => fn !== listener);
      };
    },

    navigate(to, { state, replace = false } = {}) {
      debugger;
      if (typeof to === "number") {
        source.history.go(to);
      } else {
        state = { ...state, key: Date.now() + "" };
        // try...catch iOS Safari limits to 100 pushState calls
        try {
          if (transitioning || replace) {
            source.history.replaceState(state, null, to);
          } else {
            source.history.pushState(state, null, to);
          }
        } catch (e) {
          source.location[replace ? "replace" : "assign"](to);
        }
      }

      location = getLocation(source);
      transitioning = true;
      let transition = new Promise((res) => (resolveTransition = res));
      //路由切换了后，执行当前的事件函数，从而达到刷新组件的目的。
      listeners.forEach((listener) => listener({ location, action: "PUSH" }));
      return transition;
    },
  };
};
```

因为可能当前的环境不一定是浏览器，也可能是 node 环境，因此这里还模拟了一个 history

```jsx
let createMemorySource = (initialPath = "/") => {
  let searchIndex = initialPath.indexOf("?");
  let initialLocation = {
    pathname:
      searchIndex > -1 ? initialPath.substr(0, searchIndex) : initialPath,
    search: searchIndex > -1 ? initialPath.substr(searchIndex) : "",
  };
  let index = 0;
  let stack = [initialLocation];
  let states = [null];

  return {
    get location() {
      return stack[index];
    },
    addEventListener(name, fn) {},
    removeEventListener(name, fn) {},
    history: {
      get entries() {
        return stack;
      },
      get index() {
        return index;
      },
      get state() {
        return states[index];
      },
      pushState(state, _, uri) {
        let [pathname, search = ""] = uri.split("?");
        index++;
        stack.push({ pathname, search: search.length ? `?${search}` : search });
        states.push(state);
      },
      replaceState(state, _, uri) {
        let [pathname, search = ""] = uri.split("?");
        stack[index] = { pathname, search };
        states[index] = state;
      },
      go(to) {
        let newIndex = index + to;

        if (newIndex < 0 || newIndex > states.length - 1) {
          return;
        }

        index = newIndex;
      },
    },
  };
};
```

### index.js

这是 reach/router 的主体，里面的代码虽然不多，但是各种概念却是一点也不少。

首先是最常用的 Router，其外面套了一个 BaseContext.Consumer，这里主要是防止外部有 BaseContext.Provider 的话能够进行消费，这个主要是为了嵌套路由准备的，如果不理解可暂时不看，同样的 Location 也是同理。

```jsx
// The main event, welcome to the show everybody.
let Router = (props) => (
  <BaseContext.Consumer>
    {(baseContext) => (
      <Location>
        {(locationContext) => (
          <RouterImpl {...baseContext} {...locationContext} {...props} />
        )}
      </Location>
    )}
  </BaseContext.Consumer>
);
let Location = ({ children }) => (
  <LocationContext.Consumer>
    {(context) =>
      context ? (
        children(context)
      ) : (
        <LocationProvider>{children}</LocationProvider>
      )
    }
  </LocationContext.Consumer>
);
```

同时，在 LocationProvider 中，我们会在 history 全局对象里添加监听事件函数，这样子当用户点击 Link 或者使用 navigate 跳转的时候就能够刷新 Router.

```jsx
class LocationProvider extends React.Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
  };

  static defaultProps = {
    history: globalHistory,
  };

  state = {
    context: this.getContext(),
    refs: { unlisten: null },
  };

  getContext() {
    let {
      props: {
        history: { navigate, location },
      },
    } = this;
    debugger;
    return { navigate, location };
  }

  componentDidCatch(error, info) {
    if (isRedirect(error)) {
      let {
        props: {
          history: { navigate },
        },
      } = this;
      navigate(error.uri, { replace: true });
    } else {
      throw error;
    }
  }

  componentDidMount() {
    let {
      state: { refs },
      props: { history },
    } = this;
    history._onTransitionComplete();
    //组件挂载的时候添加监听函数，当触发的时候就会更新context并且触发setState，从而实现router组件刷新
    refs.unlisten = history.listen(() => {
      Promise.resolve().then(() => {
        // TODO: replace rAF with react deferred update API when it's ready https://github.com/facebook/react/issues/13306
        requestAnimationFrame(() => {
          if (!this.unmounted) {
            this.setState(() => ({ context: this.getContext() }));
          }
        });
      });
    });
  }
  // 省略
  render() {
    let {
      state: { context },
      props: { children },
    } = this;
    return (
      <LocationContext.Provider value={context}>
        {typeof children === "function" ? children(context) : children || null}
      </LocationContext.Provider>
    );
  }
}
```

RouterImpl 组件如下，这里可以看到代码里都通过 React.Children.toArray 将 children 的都转成了数组形式（这是个非常有用的方法， 对于在 react 里，想用编程改变 jsx 的一些声明式的写法很有用），然后匹配出符合当前路由的 route，并进行渲染即可。

```jsx
class RouterImpl extends React.PureComponent {
  static defaultProps = {
    primary: true,
  };

  render() {
    let {
      location,
      navigate,
      basepath,
      primary,
      children,
      baseuri,
      component = "div",
      ...domProps
    } = this.props;
    debugger;
    let routes = React.Children.toArray(children).reduce((array, child) => {
      const routes = createRoute(basepath)(child);
      return array.concat(routes);
    }, []);
    let { pathname } = location;
    // pick函数找出匹配的函数组件
    let match = pick(routes, pathname);
    if (match) {
      let {
        params,
        uri,
        route,
        route: { value: element },
      } = match;

      // remove the /* from the end for child routes relative paths
      basepath = route.default ? basepath : route.path.replace(/\*$/, "");

      let props = {
        ...params,
        uri,
        location,
        navigate: (to, options) => navigate(resolve(to, uri), options),
      };
      // 重新构建新的一个reactElement
      let clone = React.cloneElement(
        element,
        props,
        // 判断其内部是否还会有子节点，继续循环递归
        element.props.children ? (
          <Router location={location} primary={primary}>
            {element.props.children}
          </Router>
        ) : undefined
      );

      // using 'div' for < 16.3 support
      let FocusWrapper = primary ? FocusHandler : component;
      // don't pass any props to 'div'
      let wrapperProps = primary
        ? { uri, location, component, ...domProps }
        : domProps;

      return (
        <BaseContext.Provider
          value={{ baseuri: uri, basepath, navigate: props.navigate }}
        >
          <FocusWrapper {...wrapperProps}>{clone}</FocusWrapper>
        </BaseContext.Provider>
      );
    } else {
      return null;
    }
  }
}
```

至于其中的 FocusWrapper 则是用来管理焦点状态的，属于细枝末节可以不管。另外还有一个 Match 组件，本质上实现和 Router 差不多，只是在功能上略有不同，不再赘述。

### 总结

整体代码量其实并不多，但是整体代码风格较乱，主要是早年使用 js 的原因。整体实现的功能很完善，麻雀虽小五脏俱全，也没有 react-router 各种乱七八糟的功能，该有的都有了并且没有多余的代码。不过确实比较老旧了，如果不需要它全部功能的话，没必要再去安装它，像这种库其实完全能自己实现一个。不过看看实现思路还是很不错的。
