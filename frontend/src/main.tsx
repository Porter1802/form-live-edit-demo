import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectEditor } from "./pages/ProjectEditor";
import { ProjectPreview } from "./pages/ProjectPreview";
import { ImportPage } from "./pages/ImportPage";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/", element: <ProjectsPage /> },
  { path: "/import", element: <ImportPage /> },
  { path: "/project/:id/import", element: <ImportPage /> },
  { path: "/project/:id/preview", element: <ProjectPreview /> },
  { path: "/project/:id", element: <ProjectEditor /> },
  { path: "/project/:id/:step", element: <ProjectEditor /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
