"""
Streamlit UI for Azure Blob Storage manager.
Run:  streamlit run app.py
"""

import streamlit as st
from azure_storage import AzureBlobManager
import os
import tempfile
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


def main():
    st.set_page_config(
        page_title="Azure Blob Storage Manager",
        page_icon="☁️",
        layout="wide",
    )

    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        html, body, [class*="css"] {
            font-family: 'Inter', sans-serif;
        }
        .main-header {
            background: linear-gradient(135deg, #0078D4 0%, #00BCF2 100%);
            padding: 2rem 2.5rem;
            border-radius: 16px;
            margin-bottom: 2rem;
            color: white;
        }
        .main-header h1 {
            margin: 0;
            font-size: 2rem;
            font-weight: 700;
            color: white;
        }
        .main-header p {
            margin: 0.5rem 0 0 0;
            opacity: 0.9;
            font-size: 1rem;
        }
        .blob-card {
            background: #1E1E2E;
            border: 1px solid #313244;
            border-radius: 12px;
            padding: 1.2rem;
            margin-bottom: 0.8rem;
            transition: border-color 0.2s;
        }
        .blob-card:hover {
            border-color: #0078D4;
        }
        .blob-name {
            font-weight: 600;
            font-size: 1rem;
            color: #CDD6F4;
            word-break: break-all;
        }
        .blob-meta {
            font-size: 0.8rem;
            color: #6C7086;
            margin-top: 0.3rem;
        }
        .stat-card {
            background: linear-gradient(135deg, #1E1E2E, #181825);
            border: 1px solid #313244;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: #89B4FA;
        }
        .stat-label {
            font-size: 0.85rem;
            color: #6C7086;
            margin-top: 0.3rem;
        }
        .stButton > button {
            border-radius: 8px;
            font-weight: 500;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <div class="main-header">
            <h1>☁️ Azure Blob Storage Manager</h1>
            <p>Upload, download, browse and manage files in your Azure containers</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # --- Sidebar: Connection ---
    with st.sidebar:
        st.markdown("### 🔑 Connection Settings")
        conn_str = st.text_input(
            "Connection String",
            type="password",
            value=os.getenv("connectionstring", ""),
            help="Your Azure Storage account connection string",
        )
        container = st.text_input(
            "Container Name",
            value=os.getenv("blob_container", "test20"),
        )

        connect_btn = st.button("Connect", use_container_width=True, type="primary")

    # Auto-connect on first load if env vars are present
    if not st.session_state.get("connected") and not connect_btn:
        env_conn = os.getenv("connectionstring", "")
        env_cont = os.getenv("blob_container", "")
        if env_conn and env_cont:
            try:
                mgr = AzureBlobManager(env_conn, env_cont)
                st.session_state["manager"] = mgr
                st.session_state["connected"] = True
                st.session_state["container_name"] = env_cont
            except Exception:
                pass

    if connect_btn and conn_str and container:
        try:
            mgr = AzureBlobManager(conn_str, container)
            st.session_state["manager"] = mgr
            st.session_state["connected"] = True
            st.session_state["container_name"] = container
        except Exception as e:
            st.error(f"Connection failed: {e}")
            st.session_state["connected"] = False

    if not st.session_state.get("connected"):
        st.info("👈 Enter your Azure connection string and container name in the sidebar, then click **Connect**.")
        return

    mgr: AzureBlobManager = st.session_state["manager"]

    # --- Tabs ---
    tab_upload, tab_browse, tab_download = st.tabs(["📤 Upload", "📁 Browse & Manage", "📥 Download"])

    # ========== UPLOAD TAB ==========
    with tab_upload:
        st.markdown("### Upload Files")
        uploaded_files = st.file_uploader(
            "Choose files to upload",
            accept_multiple_files=True,
            help="Select one or more files to upload to Azure Blob Storage",
        )

        col1, col2 = st.columns([3, 1])
        with col1:
            custom_prefix = st.text_input(
                "Blob name prefix (optional)",
                placeholder="e.g. assignments/hw1/",
                help="Add a folder-like prefix to the blob name",
            )

        if uploaded_files:
            st.markdown(f"**{len(uploaded_files)} file(s) selected:**")
            for uf in uploaded_files:
                st.markdown(f"- `{uf.name}` ({format_size(uf.size)})")

            if st.button("⬆️ Upload All", type="primary", use_container_width=True):
                progress = st.progress(0, text="Uploading...")
                results = []
                for i, uf in enumerate(uploaded_files):
                    blob_name = f"{custom_prefix}{uf.name}" if custom_prefix else uf.name
                    try:
                        url = mgr.upload_bytes(uf.getvalue(), blob_name, uf.type or "application/octet-stream")
                        results.append({"name": blob_name, "url": url, "status": "✅"})
                    except Exception as e:
                        results.append({"name": blob_name, "url": "", "status": f"❌ {e}"})
                    progress.progress((i + 1) / len(uploaded_files), text=f"Uploaded {i + 1}/{len(uploaded_files)}")

                st.success(f"Upload complete — {sum(1 for r in results if r['status'] == '✅')}/{len(results)} succeeded")
                for r in results:
                    if r["status"] == "✅":
                        st.code(r["url"], language=None)
                    else:
                        st.error(f"{r['name']}: {r['status']}")

    # ========== BROWSE TAB ==========
    with tab_browse:
        st.markdown("### Browse Container")

        if st.button("🔄 Refresh", use_container_width=False):
            st.session_state.pop("blob_list", None)

        try:
            blobs = mgr.list_blobs()
            st.session_state["blob_list"] = blobs
        except Exception as e:
            st.error(f"Failed to list blobs: {e}")
            blobs = []

        # Stats
        total_size = sum(b.get("size", 0) for b in blobs)
        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown(
                f'<div class="stat-card"><div class="stat-value">{len(blobs)}</div><div class="stat-label">Total Files</div></div>',
                unsafe_allow_html=True,
            )
        with col2:
            st.markdown(
                f'<div class="stat-card"><div class="stat-value">{format_size(total_size)}</div><div class="stat-label">Total Size</div></div>',
                unsafe_allow_html=True,
            )
        with col3:
            st.markdown(
                f'<div class="stat-card"><div class="stat-value">{st.session_state["container_name"]}</div><div class="stat-label">Container</div></div>',
                unsafe_allow_html=True,
            )

        st.markdown("---")

        # Search / filter
        search = st.text_input("🔍 Filter by name", placeholder="Type to filter...")

        filtered = [b for b in blobs if search.lower() in b["name"].lower()] if search else blobs

        if not filtered:
            st.info("No blobs found." if not search else "No blobs match your filter.")
        else:
            for blob in filtered:
                col_info, col_actions = st.columns([4, 1])
                with col_info:
                    st.markdown(
                        f"""
                        <div class="blob-card">
                            <div class="blob-name">📄 {blob["name"]}</div>
                            <div class="blob-meta">
                                {format_size(blob.get("size", 0))} &nbsp;·&nbsp;
                                {blob.get("content_type", "unknown")} &nbsp;·&nbsp;
                                {blob.get("last_modified", "N/A")}
                            </div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                with col_actions:
                    st.markdown("<br>", unsafe_allow_html=True)
                    if st.button("🗑️", key=f"del_{blob['name']}", help=f"Delete {blob['name']}"):
                        try:
                            mgr.delete_blob(blob["name"])
                            st.success(f"Deleted `{blob['name']}`")
                            st.rerun()
                        except Exception as e:
                            st.error(str(e))

                    if st.button("📋", key=f"url_{blob['name']}", help="Copy URL"):
                        st.code(blob["url"], language=None)

    # ========== DOWNLOAD TAB ==========
    with tab_download:
        st.markdown("### Download Files")

        try:
            blobs = mgr.list_blobs()
        except Exception:
            blobs = []

        blob_names = [b["name"] for b in blobs]
        if not blob_names:
            st.info("No blobs in the container.")
        else:
            selected = st.selectbox("Select a blob to download", blob_names)

            if selected and st.button("⬇️ Download", type="primary"):
                with st.spinner(f"Downloading `{selected}`..."):
                    try:
                        data = mgr.download_blob(selected)
                        st.download_button(
                            label=f"💾 Save `{selected}` to disk",
                            data=data,
                            file_name=os.path.basename(selected),
                            mime="application/octet-stream",
                        )
                        st.success(f"Downloaded {format_size(len(data))}")
                    except Exception as e:
                        st.error(f"Download failed: {e}")


if __name__ == "__main__":
    main()
