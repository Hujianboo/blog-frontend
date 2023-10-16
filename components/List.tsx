import Link from "next/link";
import React from "react";

interface ListProps {
  allPosts: any;
  disabled?: boolean;
}
const List: React.FC<ListProps> = ({ allPosts, disabled }) => {
  {
    return (
      <div className="article-list">
        <figcaption>
          {allPosts &&
            allPosts.map((item, index) => {
              if (disabled) {
                return (
                  <a className="article-list-href-disabled">
                    <div key={index} className="article-list-tab">
                      {item.title}
                    </div>
                  </a>
                );
              } else {
                return (
                  <Link href={`/posts/${item.title}`}>
                    <div key={index} className="article-list-tab">
                      {item.title}
                    </div>
                  </Link>
                );
              }
            })}
        </figcaption>
      </div>
    );
  }
};
export default List;
