import Link from "next/link";
export default function List({ allPosts }) {
  return (
    <div className="article-list">
      <figcaption>
        {allPosts &&
          allPosts.map((item, index) => (
            <Link href={`/posts/${item.title}`}>
              <div key={index} className="article-list-tab">
                {item.title}
              </div>
            </Link>
          ))}
      </figcaption>
    </div>
  );
}
