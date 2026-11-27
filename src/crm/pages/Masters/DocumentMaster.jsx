import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, FileText, Folder, FolderPlus, Search, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { apiClient } from '../../lib/api';
import PageLoader from '../../components/ui/PageLoader';
import { formatDateTime } from '../../lib/date';

const blankFolder = { name: '', status: 'Active' };

export default function DocumentMaster() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allFolders, setAllFolders] = useState([]);
  const [trail, setTrail] = useState([]);
  const [search, setSearch] = useState('');
  const [folderModal, setFolderModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [folderForm, setFolderForm] = useState(blankFolder);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderParent, setNewFolderParent] = useState(null);
  const [uploadTarget, setUploadTarget] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);

  const currentFolder = trail[trail.length - 1] || null;
  const load = async () => {
    setLoading(true);
    try {
      const parentQuery = currentFolder ? `?parentId=${encodeURIComponent(currentFolder.id)}` : '';
      const [children, all] = await Promise.all([
        apiClient.get(`/system-masters/documents${parentQuery}`),
        apiClient.get('/system-masters/documents?all=true'),
      ]);
      setFolders(children.data);
      setAllFolders(all.data);
    } catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { setSearch(''); load(); }, [currentFolder?.id]);

  const visibleFolders = useMemo(() => folders.filter((folder) => folder.name.toLowerCase().includes(search.toLowerCase())), [folders, search]);
  const visibleFiles = useMemo(() => (currentFolder?.files || []).filter((file) => file.name.toLowerCase().includes(search.toLowerCase())), [currentFolder, search]);
  const folderOptions = useMemo(() => allFolders.map((folder) => ({ value: folder.id, label: folder.name })), [allFolders]);

  const openFolderModal = (folder = null, parent = currentFolder) => {
    setEditingFolder(folder);
    setNewFolderParent(folder ? null : parent);
    setFolderForm(folder ? { name: folder.name, status: folder.status } : blankFolder);
    setFolderModal(true);
  };

  const saveFolder = async () => {
    if (!folderForm.name.trim()) return toast.error('Folder name is required.');
    try {
      const payload = editingFolder
        ? { ...folderForm, parentFolder: editingFolder.parentFolder || '', files: editingFolder.files || [] }
        : { ...folderForm, parentFolder: newFolderParent?.id || '', files: [] };
      const result = editingFolder
        ? await apiClient.put(`/system-masters/documents/${editingFolder.id}`, payload)
        : await apiClient.post('/system-masters/documents', payload);
      const replace = (items) => editingFolder
        ? items.map((folder) => folder.id === result.data.id ? result.data : folder)
        : [...items, result.data].sort((a, b) => a.name.localeCompare(b.name));
      setFolders(replace);
      setAllFolders(replace);
      if (currentFolder?.id === result.data.id) setTrail((items) => [...items.slice(0, -1), result.data]);
      setFolderModal(false);
      setEditingFolder(null);
      setNewFolderParent(null);
      toast.success(editingFolder ? 'Folder updated.' : 'Folder created.');
    } catch (error) { toast.error(error.message); }
  };

  const openUpload = () => {
    if (!allFolders.length) return toast.error('Create a folder before uploading files.');
    setUploadTarget(currentFolder?.id || '');
    setSelectedFiles([]);
    setUploadModal(true);
  };

  const openUploadForFolder = (folder) => {
    setUploadTarget(folder.id);
    setSelectedFiles([]);
    setUploadModal(true);
  };

  const uploadFiles = async () => {
    if (!uploadTarget) return toast.error('Choose a destination folder.');
    if (!selectedFiles.length) return toast.error('Choose at least one file.');
    const target = allFolders.find((folder) => folder.id === uploadTarget);
    if (!target) return toast.error('The selected folder is no longer available.');
    try {
      const body = new FormData();
      selectedFiles.forEach((file) => body.append('documentFiles', file));
      const uploaded = await apiClient.upload('/uploads?folder=documents', body);
      const files = [...(target.files || []), ...uploaded.data.map(({ field, ...file }) => file)];
      const result = await apiClient.put(`/system-masters/documents/${target.id}`, { name: target.name, status: target.status, parentFolder: target.parentFolder || '', files });
      setAllFolders((items) => items.map((folder) => folder.id === result.data.id ? result.data : folder));
      if (currentFolder?.id === result.data.id) setTrail((items) => [...items.slice(0, -1), result.data]);
      setUploadModal(false);
      toast.success(`${uploaded.data.length} file(s) uploaded.`);
    } catch (error) { toast.error(error.message); }
  };

  const completeDelete = async () => {
    if (!pendingAction) return;
    try {
      if (pendingAction.kind === 'folder') {
        await apiClient.delete(`/system-masters/documents/${pendingAction.folder.id}`);
        setFolders((items) => items.filter((folder) => folder.id !== pendingAction.folder.id));
        setAllFolders((items) => items.filter((folder) => folder.id !== pendingAction.folder.id));
        toast.success('Folder deleted.');
      } else {
        const result = await apiClient.delete(`/system-masters/documents/${currentFolder.id}/files`, { key: pendingAction.file.key });
        setAllFolders((items) => items.map((folder) => folder.id === result.data.id ? result.data : folder));
        setTrail((items) => [...items.slice(0, -1), result.data]);
        toast.success('File deleted.');
      }
    } catch (error) { toast.error(error.message); }
  };

  return <div className="p-6 space-y-5">
    {/* Page Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => navigate("/masters")} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex-shrink-0 mt-0.5" title="Go Back"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-none">My Documents</h1>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Create folders, nested subfolders, and manage shared documents.</p>
        </div>
      </div>
      <div className="flex-1 max-w-xl mx-0 md:mx-8">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm transition-all" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by Folder" />
        </div>
      </div>
    </div>
    <div className="card p-5 min-h-[420px]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-b border-slate-100 pb-5">
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap">
          {currentFolder && <button className="btn-secondary flex items-center justify-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-sm" onClick={() => setTrail((items) => items.slice(0, -1))}><ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />Back</button>}
          <button className="btn-secondary flex items-center justify-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-sm" onClick={() => openFolderModal()}><FolderPlus className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />{currentFolder ? 'New Subfolder' : 'New Root Folder'}</button>
          <button className="btn-primary flex items-center justify-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-sm" onClick={openUpload}><Upload className="w-3 h-3 sm:w-4 sm:h-4" />Upload Files</button>
        </div>
        <div className="flex items-center text-[13px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
          <span className="text-slate-500 mr-2">Location:</span>
          <button className={`hover:text-blue-600 transition-colors ${!currentFolder ? 'font-semibold text-slate-800' : 'text-slate-600'}`} onClick={() => setTrail([])}>My Documents</button>
          {trail.map((folder, index) => <React.Fragment key={folder.id}><span className="text-slate-300 mx-1.5">/</span><button className={`hover:text-blue-600 transition-colors ${index === trail.length - 1 ? 'font-semibold text-slate-800' : 'text-slate-600'}`} onClick={() => setTrail((items) => items.slice(0, index + 1))}>{folder.name}</button></React.Fragment>)}
        </div>
      </div>
      {loading ? <PageLoader label="Loading folders and files…" /> : <><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-900 text-white"><th className="table-header text-white">Folder Name</th><th className="table-header text-white">Modified</th><th className="table-header text-white">Created</th><th className="table-header text-white">Action</th></tr></thead><tbody className="divide-y divide-slate-200">
        {visibleFolders.map((folder) => <tr className="table-row hover:bg-slate-50" key={folder.id}><td className="table-cell"><button className="flex items-center gap-2 text-primary-600 hover:underline" onClick={() => setTrail((items) => [...items, folder])}><Folder className="w-7 h-7 text-amber-500 fill-amber-200" /><span>{folder.name}</span></button></td><td className="table-cell text-slate-600">{formatDateTime(folder.updatedAt)}</td><td className="table-cell text-slate-600">BuildSoftware</td><td className="table-cell"><div className="flex flex-wrap gap-2"><button className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-900" title={`Upload to ${folder.name}`} onClick={() => openUploadForFolder(folder)}><Upload className="w-4 h-4" />Upload</button><button className="text-green-600 hover:text-green-800" title="Create subfolder" onClick={() => openFolderModal(null, folder)}><FolderPlus className="w-4 h-4" /></button><button className="text-red-400 hover:text-red-600" title="Delete folder" onClick={() => setPendingAction({ kind: 'folder', folder })}><Trash2 className="w-4 h-4" /></button><button className="text-primary-500 hover:text-primary-700" title="Edit folder" onClick={() => openFolderModal(folder)}><Edit className="w-4 h-4" /></button></div></td></tr>)}
        {visibleFiles.map((file) => <tr className="table-row hover:bg-slate-50" key={file.key}><td className="table-cell"><a className="flex items-center gap-2 text-primary-600 hover:underline" href={file.url} target="_blank" rel="noreferrer"><FileText className="w-6 h-6 text-red-500" /><span>{file.name}</span></a></td><td className="table-cell text-slate-600">{formatDateTime(currentFolder.updatedAt)}</td><td className="table-cell text-slate-600">BuildSoftware</td><td className="table-cell"><button className="text-red-400 hover:text-red-600" title="Delete file" onClick={() => setPendingAction({ kind: 'file', file })}><Trash2 className="w-4 h-4" /></button></td></tr>)}
      </tbody></table></div>
      {!visibleFolders.length && !visibleFiles.length && <div className="py-16 text-center text-sm text-slate-500">{search ? 'No matching folders or files.' : currentFolder ? 'This folder is empty. Create a subfolder or upload a file.' : 'No folders yet. Create your first folder to get started.'}</div>}</>}
    </div>
    <Modal isOpen={folderModal} onClose={() => { setFolderModal(false); setEditingFolder(null); setNewFolderParent(null); }} title={editingFolder ? 'Edit Folder' : newFolderParent ? `Create Subfolder in ${newFolderParent.name}` : 'Create Root Folder'} footer={<><button className="btn-secondary" onClick={() => { setFolderModal(false); setEditingFolder(null); setNewFolderParent(null); }}>Cancel</button><button className="btn-primary text-xs h-8 px-3 flex-shrink-0" onClick={saveFolder}>{editingFolder ? 'Save Changes' : newFolderParent ? 'Create Subfolder' : 'Create Root Folder'}</button></>}>
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
        <h3 className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <span className="w-1 h-3 rounded-full bg-blue-500"></span>
          Folder Details
        </h3>
        {!editingFolder && <div className="mb-4 rounded-lg bg-blue-50/50 border border-blue-100 px-3 py-2.5 text-xs text-blue-700 flex items-center gap-2"><Folder className="w-4 h-4" /> Location: <span className="font-semibold">{newFolderParent ? newFolderParent.name : 'My Documents (root)'}</span></div>}
        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
          <label><span className="form-label">Folder Name *</span><input className="form-input" value={folderForm.name} onChange={(event) => setFolderForm((value) => ({ ...value, name: event.target.value }))} placeholder="Enter folder name" /></label>
          <label><span className="form-label">Status</span><SearchableSelect options={['Active', 'Inactive']} value={folderForm.status} onChange={(status) => setFolderForm((value) => ({ ...value, status }))} /></label>
        </div>
      </div>
    </Modal>
    <Modal isOpen={uploadModal} onClose={() => setUploadModal(false)} title={currentFolder ? `Upload to ${currentFolder.name}` : 'Upload Documents'} size="lg" footer={<><button className="btn-secondary" onClick={() => setUploadModal(false)}>Cancel</button><button className="btn-primary text-xs h-8 px-3 flex-shrink-0" onClick={uploadFiles}><Upload className="w-4 h-4" />Upload Files</button></>}>
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
        <h3 className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <span className="w-1 h-3 rounded-full bg-blue-500"></span>
          Upload Details
        </h3>
        <div className="mb-4 rounded-lg bg-blue-50/50 border border-blue-100 px-3 py-2.5 text-xs text-blue-700 flex items-center gap-2">Files are saved to the selected location. You can change it before uploading.</div>
        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
          <label>
            <span className="form-label">Destination Folder *</span>
            <SearchableSelect options={folderOptions} value={uploadTarget} onChange={setUploadTarget} placeholder="Select folder" />
          </label>
          <label>
            <span className="form-label">Choose files *</span>
            <div className={`relative flex items-center w-full bg-white border ${selectedFiles.length > 0 ? 'border-green-200 ring-1 ring-green-100' : 'border-slate-200'} rounded-lg px-2.5 py-1.5 shadow-sm transition-all hover:border-blue-300 overflow-hidden`}>
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,application/pdf" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))} />
              <div className={`text-xs font-medium px-2 py-0.5 rounded border mr-2 transition-colors ${selectedFiles.length > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>Choose files</div>
              <span className={`text-xs truncate ${selectedFiles.length > 0 ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'No file chosen'}
              </span>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">Images and PDFs only, up to 10 files and 8 MB per file.</p>
          </label>
        </div>
      </div>
    </Modal>
    <ConfirmDialog isOpen={!!pendingAction} onClose={() => setPendingAction(null)} onConfirm={completeDelete} title={pendingAction?.kind === 'file' ? 'Delete file' : 'Delete folder'} message={pendingAction?.kind === 'file' ? 'This permanently removes the file from storage.' : 'Only an empty folder can be deleted. Move or remove its contents first.'} />
  </div>;
}
