import Link from 'next/link'
import classnames from 'classnames'
export default function TopBar({}) {
  return (
      <div className="top-bar">
        <Link href={"/"}>
          <div
            className={classnames({
              "flip-container": true,
            })}
          >
            <div className="flipper">
              <div className="front">
                <img
                  className="avatar"
                  src={'/avatar-front.png'}
                  alt=""
                  width={40}
                  height={40}
                />
              </div>
              <div className="back">
                <img
                  className="avatar"
                  src={'/avatar-back.png'}
                  alt=""
                  width={40}
                  height={40}
                />
              </div>
            </div>
          </div>
        </Link>
        <div className="nav">
          <Link href={"/tech"}>
            <div className="tag">技术</div>
          </Link>
          <Link href={"/game"}>
            <div className="tag">游戏</div>
          </Link>
          <Link href={"/reading"}>
            <div className="tag">阅读</div>
          </Link>
          <Link href={"/life"}>
            <div className="tag">生活</div>
          </Link>
          <Link href={"/about"} >
            <div className="tag">关于我</div>
          </Link>
        </div>
      </div>
  )
}