import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Post } from "../types";
import { deletePost, getPost } from "../lib/posts";
import { presignGet } from "../lib/uploads";

export default function PostDetail() {
    const { id } = useParams();
    const postId = Number(id);
    const nav = useNavigate();

    const [post, setPost] = useState<Post | null>(null);
    const [imgUrl, setImgUrl] = useState<string>("");
    const [err, setErr] = useState<string>("");

    // 게시글 로드
    useEffect(() => {
        if (!Number.isFinite(postId)) return;
        getPost(postId)
            .then((p) => {
                setPost(p);
                setErr("");
            })
            .catch((e) => setErr(String(e)));
    }, [postId]);

    // image_key가 있으면 presigned GET URL 받아오기
    useEffect(() => {
        let cancelled = false;

        setImgUrl("");
        if (!post?.image_key) return;

        presignGet(post.image_key)
            .then(({ url }) => {
                if (!cancelled) setImgUrl(url);
            })
            .catch((e) => {
                if (!cancelled) setErr(String(e));
            });

        return () => {
            cancelled = true;
        };
    }, [post?.image_key]);

    async function onDelete() {
        if (!confirm("Delete this post?")) return;
        try {
            await deletePost(postId);
            nav("/");
        } catch (e) {
            setErr(String(e));
        }
    }

    if (!Number.isFinite(postId)) return <div>Invalid id</div>;

    return (
        <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 12 }}>
                <Link to="/">Back</Link>{" "}
                <Link to={`/posts/${postId}/edit`}>Edit</Link>{" "}
                <button onClick={onDelete}>Delete</button>
            </div>

            {err && <pre style={{ color: "crimson" }}>{err}</pre>}

            {!post ? (
                <div>Loading...</div>
            ) : (
                <>
                    <h1>{post.title}</h1>

                    { }
                    {imgUrl && (
                        <div style={{ margin: "12px 0" }}>
                            <img
                                src={imgUrl}
                                alt="post"
                                style={{ maxWidth: 520, width: "100%", borderRadius: 8 }}
                            />
                        </div>
                    )}

                    <p>{post.content}</p>
                    <div>image_key: {String(post.image_key ?? "")}</div>
                </>
            )}
        </div>
    );
}