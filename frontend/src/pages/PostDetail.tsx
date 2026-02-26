import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Post } from "../types";
import { deletePost, getPost } from "../lib/posts";

export default function PostDetail() {
    const { id } = useParams();
    const postId = Number(id);
    const nav = useNavigate();

    const [post, setPost] = useState<Post | null>(null);
    const [err, setErr] = useState<string>("");

    useEffect(() => {
        if (!Number.isFinite(postId)) return;
        getPost(postId)
            .then(setPost)
            .catch((e) => setErr(String(e)));
    }, [postId]);

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
                    <p>{post.content}</p>
                    <div>image_key: {String(post.image_key ?? "")}</div>
                </>
            )}
        </div>
    );
}