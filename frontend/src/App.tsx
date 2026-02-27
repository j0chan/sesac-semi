import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Login from "./pages/Login";
import PostDetail from "./pages/PostDetail";
import PostEditor from "./pages/PostEditor";
import PostsList from "./pages/PostsList";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<PostsList />} />
          <Route path="/posts/new" element={<PostEditor />} />
          <Route path="/posts/:id/edit" element={<PostEditor />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/login" element={<Login />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
