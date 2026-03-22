import React, { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../config/api';
import { getGravatarUrl, hasGravatar, openGravatarSetup } from '../../utils/gravatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
// Textarea no longer needed — replaced with SignatureEditor
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../ui/dialog';
import {
  Mail, Shield, Settings, Building2, CreditCard,
  Upload, Edit2, Save, X, ChevronDown, ChevronUp,
  Lock, Forward, Ban, HardDrive, Globe, Plus,
  Zap, Check, ShoppingCart, Bold, Italic, Underline,
  Link, Image, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Palette, Code, Eye, Pencil,
  Minus, Undo2, Redo2, FileText, Sparkles
} from 'lucide-react';

// ─── Signature Templates ────────────────────────────────────────────
const SIGNATURE_TEMPLATES = [
  {
    name: 'Professional',
    preview: 'Clean professional look',
    generate: (name, title, email, phone, company, website) => `
<table cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; line-height: 1.5;">
  <tr>
    <td style="padding-right: 16px; border-right: 3px solid #3B82F6;">
      <p style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">${name || 'Your Name'}</p>
      <p style="margin: 2px 0 0; font-size: 13px; color: #6B7280;">${title || 'Your Title'}</p>
      ${company ? `<p style="margin: 2px 0 0; font-size: 13px; font-weight: 600; color: #3B82F6;">${company}</p>` : ''}
    </td>
    <td style="padding-left: 16px;">
      ${email ? `<p style="margin: 0; font-size: 13px; color: #4B5563;">✉ <a href="mailto:${email}" style="color: #3B82F6; text-decoration: none;">${email}</a></p>` : ''}
      ${phone ? `<p style="margin: 2px 0 0; font-size: 13px; color: #4B5563;">📞 ${phone}</p>` : ''}
      ${website ? `<p style="margin: 2px 0 0; font-size: 13px; color: #4B5563;">🌐 <a href="${website}" style="color: #3B82F6; text-decoration: none;">${website}</a></p>` : ''}
    </td>
  </tr>
</table>`
  },
  {
    name: 'Minimal',
    preview: 'Simple and clean',
    generate: (name, title, email, phone, company, website) => `
<table cellpadding="0" cellspacing="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #555;">
  <tr><td>
    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #111;">${name || 'Your Name'}</p>
    <p style="margin: 2px 0 8px; font-size: 12px; color: #888;">${[title, company].filter(Boolean).join(' · ')}</p>
    <p style="margin: 0; font-size: 12px; color: #888;">${[email, phone].filter(Boolean).join(' | ')}${website ? ` | <a href="${website}" style="color: #666; text-decoration: none;">${website.replace(/^https?:\/\//, '')}</a>` : ''}</p>
  </td></tr>
</table>`
  },
  {
    name: 'Bold Card',
    preview: 'Eye-catching card style',
    generate: (name, title, email, phone, company, website) => `
<table cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; background: linear-gradient(135deg, #1e293b, #334155); border-radius: 10px; overflow: hidden; max-width: 400px;">
  <tr><td style="padding: 20px;">
    <p style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">${name || 'Your Name'}</p>
    <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">${title || 'Your Title'}${company ? ` @ ${company}` : ''}</p>
    <hr style="border: none; border-top: 1px solid #475569; margin: 12px 0;" />
    <table cellpadding="0" cellspacing="0" style="font-size: 12px;">
      ${email ? `<tr><td style="color: #94a3b8; padding: 2px 0;">✉&nbsp;&nbsp;</td><td><a href="mailto:${email}" style="color: #60a5fa; text-decoration: none;">${email}</a></td></tr>` : ''}
      ${phone ? `<tr><td style="color: #94a3b8; padding: 2px 0;">📞&nbsp;&nbsp;</td><td style="color: #e2e8f0;">${phone}</td></tr>` : ''}
      ${website ? `<tr><td style="color: #94a3b8; padding: 2px 0;">🌐&nbsp;&nbsp;</td><td><a href="${website}" style="color: #60a5fa; text-decoration: none;">${website.replace(/^https?:\/\//, '')}</a></td></tr>` : ''}
    </table>
  </td></tr>
</table>`
  },
  {
    name: 'Corporate',
    preview: 'Formal business style',
    generate: (name, title, email, phone, company, website) => `
<table cellpadding="0" cellspacing="0" style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; color: #333; border-top: 2px solid #1a365d; padding-top: 12px;">
  <tr><td>
    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1a365d; letter-spacing: 0.5px;">${name || 'Your Name'}</p>
    <p style="margin: 2px 0 0; font-size: 13px; color: #4a5568; font-style: italic;">${title || 'Your Title'}</p>
    ${company ? `<p style="margin: 6px 0 0; font-size: 14px; font-weight: 600; color: #2d3748; text-transform: uppercase; letter-spacing: 1px;">${company}</p>` : ''}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 10px 0;" />
    <p style="margin: 0; font-size: 12px; color: #718096;">${[email ? `<a href="mailto:${email}" style="color: #2b6cb0; text-decoration: none;">${email}</a>` : '', phone, website ? `<a href="${website}" style="color: #2b6cb0; text-decoration: none;">${website.replace(/^https?:\/\//, '')}</a>` : ''].filter(Boolean).join(' &nbsp;|&nbsp; ')}</p>
  </td></tr>
</table>`
  }
];

// ─── HTML Signature Editor Component ────────────────────────────────
function SignatureEditor({ value, onChange, onSave, saving, account }) {
  const editorRef = useRef(null);
  const [mode, setMode] = useState('visual'); // 'visual' | 'html' | 'preview'
  const [htmlSource, setHtmlSource] = useState(value || '');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fontSize, setFontSize] = useState('3');
  const [fontColor, setFontColor] = useState('#333333');

  // Template fields
  const [tplName, setTplName] = useState('');
  const [tplTitle, setTplTitle] = useState('');
  const [tplEmail, setTplEmail] = useState('');
  const [tplPhone, setTplPhone] = useState('');
  const [tplCompany, setTplCompany] = useState('');
  const [tplWebsite, setTplWebsite] = useState('');

  // Initialize editor content when value changes externally
  useEffect(() => {
    if (editorRef.current && mode === 'visual') {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    setHtmlSource(value || '');
  }, [value, mode]);

  // Sync on mode switch
  const switchMode = (newMode) => {
    if (mode === 'visual' && editorRef.current) {
      const html = editorRef.current.innerHTML;
      setHtmlSource(html);
      onChange(html);
    } else if (mode === 'html') {
      onChange(htmlSource);
      if (editorRef.current) editorRef.current.innerHTML = htmlSource;
    }
    setMode(newMode);
  };

  const execCmd = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    // Sync after command
    setTimeout(() => {
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    }, 0);
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInsertLink = () => {
    if (!linkUrl) return;
    const html = linkText
      ? `<a href="${linkUrl}" style="color: #3B82F6; text-decoration: underline;">${linkText}</a>`
      : `<a href="${linkUrl}" style="color: #3B82F6; text-decoration: underline;">${linkUrl}</a>`;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
    setTimeout(handleEditorInput, 0);
  };

  const handleInsertImage = () => {
    if (!imageUrl) return;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, `<img src="${imageUrl}" style="max-width: 200px; height: auto; border-radius: 4px;" />`);
    setShowImageDialog(false);
    setImageUrl('');
    setTimeout(handleEditorInput, 0);
  };

  const applyTemplate = (template) => {
    const html = template.generate(
      tplName || account?.displayName || '',
      tplTitle,
      tplEmail || account?.email || '',
      tplPhone,
      tplCompany,
      tplWebsite
    );
    onChange(html);
    setHtmlSource(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setShowTemplates(false);
    toast.success(`"${template.name}" template applied`);
  };

  const ToolbarBtn = ({ onClick, active, children, title }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
    >
      {children}
    </button>
  );

  const ToolbarSep = () => <div className="w-px h-5 bg-border mx-0.5" />;

  return (
    <div className="space-y-3">
      {/* Mode Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => switchMode('visual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'visual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Pencil className="h-3 w-3" /> Visual
          </button>
          <button
            onClick={() => switchMode('html')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'html' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Code className="h-3 w-3" /> HTML
          </button>
          <button
            onClick={() => switchMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-xs"
        >
          <Sparkles className="h-3 w-3 mr-1.5" /> Templates
        </Button>
      </div>

      {/* Visual Editor Toolbar */}
      {mode === 'visual' && (
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 rounded-lg border border-border bg-muted/50">
          {/* Text Style */}
          <ToolbarBtn onClick={() => execCmd('bold')} title="Bold"><Bold className="h-3.5 w-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('italic')} title="Italic"><Italic className="h-3.5 w-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('underline')} title="Underline"><Underline className="h-3.5 w-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('strikeThrough')} title="Strikethrough"><Minus className="h-3.5 w-3.5" /></ToolbarBtn>

          <ToolbarSep />

          {/* Font Size */}
          <select
            value={fontSize}
            onChange={(e) => { setFontSize(e.target.value); execCmd('fontSize', e.target.value); }}
            className="h-7 text-xs rounded-md border border-border bg-background px-1.5 text-foreground cursor-pointer"
            title="Font Size"
          >
            <option value="1">Small</option>
            <option value="2">Normal</option>
            <option value="3">Medium</option>
            <option value="4">Large</option>
            <option value="5">X-Large</option>
          </select>

          {/* Font Color */}
          <div className="relative" title="Text Color">
            <input
              type="color"
              value={fontColor}
              onChange={(e) => { setFontColor(e.target.value); execCmd('foreColor', e.target.value); }}
              className="absolute inset-0 w-7 h-7 opacity-0 cursor-pointer"
            />
            <div className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted cursor-pointer">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-1 rounded-full" style={{ backgroundColor: fontColor }} />
            </div>
          </div>

          <ToolbarSep />

          {/* Alignment */}
          <ToolbarBtn onClick={() => execCmd('justifyLeft')} title="Align Left"><AlignLeft className="h-3.5 w-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('justifyCenter')} title="Align Center"><AlignCenter className="h-3.5 w-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('justifyRight')} title="Align Right"><AlignRight className="h-3.5 w-3.5" /></ToolbarBtn>

          <ToolbarSep />

          {/* Lists */}
          <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} title="Bullet List"><List className="h-3.5 w-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('insertOrderedList')} title="Numbered List"><ListOrdered className="h-3.5 w-3.5" /></ToolbarBtn>

          <ToolbarSep />

          {/* Insert */}
          <ToolbarBtn onClick={() => setShowLinkDialog(true)} title="Insert Link"><Link className="h-3.5 w-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => setShowImageDialog(true)} title="Insert Image"><Image className="h-3.5 w-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('insertHorizontalRule')} title="Horizontal Line"><Minus className="h-3.5 w-3.5" /></ToolbarBtn>

          <ToolbarSep />

          {/* Undo/Redo */}
          <ToolbarBtn onClick={() => execCmd('undo')} title="Undo"><Undo2 className="h-3.5 w-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('redo')} title="Redo"><Redo2 className="h-3.5 w-3.5" /></ToolbarBtn>

          <ToolbarSep />

          {/* Clear */}
          <ToolbarBtn onClick={() => execCmd('removeFormat')} title="Clear Formatting"><X className="h-3.5 w-3.5" /></ToolbarBtn>
        </div>
      )}

      {/* Editor Area */}
      {mode === 'visual' && (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInput}
          className="min-h-[180px] max-h-[400px] overflow-y-auto p-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ lineHeight: '1.6' }}
          data-placeholder="Start typing your signature, or pick a template..."
        />
      )}

      {mode === 'html' && (
        <div className="relative">
          <textarea
            value={htmlSource}
            onChange={(e) => {
              setHtmlSource(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="<p>Paste or write your HTML signature here...</p>"
            rows={10}
            className="w-full min-h-[180px] max-h-[400px] p-4 rounded-lg border border-border bg-background text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            spellCheck={false}
          />
          <Badge variant="outline" className="absolute top-2 right-2 text-[10px]">HTML</Badge>
        </div>
      )}

      {mode === 'preview' && (
        <div className="rounded-lg border border-border bg-white p-6 min-h-[180px]">
          {value ? (
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Signature Preview</p>
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-400 mb-2">--</p>
                <div
                  className="signature-preview"
                  dangerouslySetInnerHTML={{ __html: value }}
                  style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '14px', color: '#333' }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No signature yet — switch to Visual or HTML mode to create one
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { if (mode === 'html') { onChange(htmlSource); } onSave(); }} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? 'Saving...' : 'Save Signature'}
          </Button>
          {value && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { onChange(''); setHtmlSource(''); if (editorRef.current) editorRef.current.innerHTML = ''; }}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
        {value && <span className="text-[10px] text-muted-foreground">HTML supported · Auto-appended to outgoing emails</span>}
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">URL</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Display Text (optional)</Label>
              <Input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Click here" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="ghost" onClick={() => setShowLinkDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleInsertLink} disabled={!linkUrl}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Insert Image</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-xs">Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/logo.png" className="mt-1" />
            {imageUrl && (
              <div className="mt-3 p-3 rounded-md bg-muted flex items-center justify-center">
                <img src={imageUrl} alt="Preview" className="max-h-20 max-w-full object-contain" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button size="sm" variant="ghost" onClick={() => setShowImageDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleInsertImage} disabled={!imageUrl}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates Panel */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Signature Templates</DialogTitle>
            <DialogDescription className="text-xs">Fill in your details and choose a template</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder={account?.displayName || 'John Doe'} className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Job Title</Label>
              <Input value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} placeholder="Software Engineer" className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={tplEmail} onChange={(e) => setTplEmail(e.target.value)} placeholder={account?.email || 'you@example.com'} className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={tplPhone} onChange={(e) => setTplPhone(e.target.value)} placeholder="+1 (555) 123-4567" className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Input value={tplCompany} onChange={(e) => setTplCompany(e.target.value)} placeholder="Acme Inc" className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Website</Label>
              <Input value={tplWebsite} onChange={(e) => setTplWebsite(e.target.value)} placeholder="https://acme.com" className="mt-1 h-8 text-xs" />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3 mt-3">
            {SIGNATURE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => applyTemplate(tpl)}
                className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium text-foreground">{tpl.name}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{tpl.preview}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const buildFallbackAvatar = (name, email) => {
  const label = name || email || 'User';
  return `https://ui-avatars.com/api/?background=3B82F6&color=fff&name=${encodeURIComponent(label)}`;
};

function MailSettings({ account, accounts, user, onAvatarUpload, uploading, uploadError, uploadSuccess }) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('mailbox');

  // Mailbox settings state
  const displayName = account?.displayName || account?.email?.split('@')[0] || 'Mailbox User';
  const avatarSrc = user?.emailAvatar || user?.profileImage || buildFallbackAvatar(displayName, account?.email || user?.email);

  const [signature, setSignature] = useState('');
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [displayNameSaving, setDisplayNameSaving] = useState(false);

  // Storage
  const [storageUsage, setStorageUsage] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // Password
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Forwarding
  const [showForwardingSection, setShowForwardingSection] = useState(false);
  const [forwardingEnabled, setForwardingEnabled] = useState(false);
  const [forwardTo, setForwardTo] = useState('');
  const [forwardingSaving, setForwardingSaving] = useState(false);

  // Blocked senders
  const [showBlockedSection, setShowBlockedSection] = useState(false);
  const [blockedSenders, setBlockedSenders] = useState([]);
  const [newBlockedEmail, setNewBlockedEmail] = useState('');
  const [blockedLoading, setBlockedLoading] = useState(false);

  // Gravatar
  const [hasCustomGravatar, setHasCustomGravatar] = useState(false);
  const [gravatarUrl, setGravatarUrl] = useState(null);
  const [gravatarChecking, setGravatarChecking] = useState(false);

  // Workspace state
  const [workspaceData, setWorkspaceData] = useState({ name: '', description: '', type: 'Business', plan: 'Free', storageUsed: 0, storageTotal: 10, teamMembers: 0 });
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Preferences
  const [preferences, setPreferences] = useState({
    defaultTracking: true,
    emailNotifications: true,
    weeklyReports: false,
    lowCreditAlert: true
  });

  // Billing
  const [billingData, setBillingData] = useState(null);
  const [emailUsage, setEmailUsage] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(10000);
  const [purchasing, setPurchasing] = useState(false);

  const PRICE_PER_1000 = 0.30;
  const calculatePrice = (emails) => ((emails / 1000) * PRICE_PER_1000).toFixed(2);

  const emailPackages = [
    { emails: 5000, popular: false },
    { emails: 10000, popular: true },
    { emails: 25000, popular: false },
    { emails: 50000, popular: false },
    { emails: 100000, popular: false },
    { emails: 250000, popular: false }
  ];

  const checkPasswordStrength = (password) => {
    if (!password) return '';
    if (password.length < 8) return 'weak';
    if (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*]/.test(password)) return 'strong';
    if (password.length < 10) return 'medium';
    return 'medium';
  };

  // Load all data on mount
  useEffect(() => {
    Promise.all([loadWorkspaceData(), loadPreferences(), loadBillingData()]);
  }, []);

  // Load mailbox-specific data when account changes
  useEffect(() => {
    if (account?._id) {
      api.get(`/email-accounts/${account._id}/signature`).then(res => {
        if (res.data.success) setSignature(res.data.signature || '');
      }).catch(() => {});
      setStorageLoading(true);
      api.get(`/email-accounts/${account._id}/storage-usage`).then(res => {
        if (res.data.success) setStorageUsage(res.data.storage);
      }).catch(() => {}).finally(() => setStorageLoading(false));
    }
  }, [account?._id]);

  useEffect(() => { setPasswordStrength(checkPasswordStrength(newPassword)); }, [newPassword]);

  useEffect(() => {
    if (account?._id && showForwardingSection) {
      api.get(`/email-accounts/${account._id}/forwarding`).then(res => {
        if (res.data.success) { setForwardingEnabled(res.data.forwardingEnabled || false); setForwardTo(res.data.forwardTo || ''); }
      }).catch(() => {});
    }
  }, [account?._id, showForwardingSection]);

  useEffect(() => {
    if (account?._id && showBlockedSection) {
      setBlockedLoading(true);
      api.get(`/email-accounts/${account._id}/blocked-senders`).then(res => {
        if (res.data.success) setBlockedSenders(res.data.blockedSenders || []);
      }).catch(() => {}).finally(() => setBlockedLoading(false));
    }
  }, [account?._id, showBlockedSection]);

  useEffect(() => {
    const checkUserGravatar = async () => {
      const email = user?.email || account?.email;
      if (!email) return;
      setGravatarChecking(true);
      setGravatarUrl(getGravatarUrl(email, 200));
      setHasCustomGravatar(await hasGravatar(email));
      setGravatarChecking(false);
    };
    checkUserGravatar();
  }, [user?.email, account?.email]);

  // Data fetchers
  const loadWorkspaceData = async () => {
    try {
      // Use /profile endpoint (baseURL already has /api)
      const res = await api.get('/profile');
      if (res.data) {
        const u = res.data;
        const companyId = u.companyId?._id || u.companyId;
        let companyData = {};
        let memberCount = 1;
        let totalStorageUsed = 0;

        // Fetch company details
        if (companyId) {
          try {
            const companyRes = await api.get('/company/details');
            if (companyRes.data) {
              companyData = companyRes.data.company || companyRes.data;
              memberCount = companyData.members?.length || companyData.memberCount || 1;
            }
          } catch (e) {
            // Fallback to profile data
            companyData = { companyName: u.companyId?.companyName || 'My Workspace' };
          }
        }

        // Calculate real storage from all email accounts
        try {
          const accountsRes = await api.get('/email-accounts/by-verified-domain');
          if (accountsRes.data.success && accountsRes.data.accounts) {
            totalStorageUsed = accountsRes.data.accounts.reduce((sum, acc) => sum + (acc.usedStorage || 0), 0);
          }
        } catch (e) {}

        const plan = u.subscription?.plan || 'Free';
        const storageTotalGB = plan === 'Pro' ? 50 : plan === 'Business' ? 100 : 10;

        setWorkspaceData({
          name: companyData.companyName || companyData.name || u.companyId?.companyName || 'My Workspace',
          description: companyData.description || '',
          type: companyData.type || companyData.industry || 'Business',
          plan: plan,
          storageUsed: totalStorageUsed,
          storageTotal: storageTotalGB,
          teamMembers: memberCount,
          industry: companyData.industry || '',
          teamSize: companyData.teamSize || '1-10',
          address: companyData.address || {}
        });
      }
    } catch (e) {}
  };

  const loadPreferences = async () => {
    try {
      const res = await api.get('/users/preferences');
      if (res.data.success && res.data.preferences) {
        setPreferences(prev => ({ ...prev, ...res.data.preferences }));
      }
    } catch (e) {}
  };

  const loadBillingData = async () => {
    try {
      const [billingRes, usageRes] = await Promise.all([
        api.get('/billing/info').catch(() => ({ data: { billing: { emailCredits: 0, totalPurchased: 0, totalUsed: 0 } } })),
        api.get('/billing/usage').catch(() => ({ data: { usage: { thisMonth: 0, lastMonth: 0, total: 0 } } }))
      ]);
      setBillingData(billingRes.data?.billing || billingRes.data);
      setEmailUsage(usageRes.data?.usage || usageRes.data);
    } catch (e) {}
  };

  // Handlers
  const handleFileChange = (e) => { const file = e.target.files?.[0]; if (file) { onAvatarUpload(file); e.target.value = ''; } };

  const handleSignatureSave = async () => {
    setSignatureSaving(true);
    try {
      const res = await api.put(`/email-accounts/${account._id}/signature`, { signature });
      if (res.data.success) toast.success('Signature saved');
    } catch (e) { toast.error('Failed to save signature'); }
    finally { setSignatureSaving(false); }
  };

  const handleDisplayNameSave = async () => {
    if (!newDisplayName.trim()) { toast.error('Display name cannot be empty'); return; }
    setDisplayNameSaving(true);
    try {
      const res = await api.put(`/email-accounts/${account._id}/display-name`, { displayName: newDisplayName.trim() });
      if (res.data.success) { toast.success('Sender name updated'); setEditingDisplayName(false); window.location.reload(); }
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to update sender name'); }
    finally { setDisplayNameSaving(false); }
  };

  const handlePasswordSave = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setPasswordSaving(true);
    try {
      const res = await api.put(`/email-accounts/${account._id}/reset-password`, { newPassword });
      if (res.data.success) { toast.success('Password updated'); setNewPassword(''); setConfirmPassword(''); setShowPasswordSection(false); }
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to update password'); }
    finally { setPasswordSaving(false); }
  };

  const handleForwardingSave = async () => {
    if (forwardingEnabled && !forwardTo) { toast.error('Enter a forward-to email'); return; }
    if (forwardingEnabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forwardTo)) { toast.error('Enter a valid email'); return; }
    setForwardingSaving(true);
    try {
      await api.put(`/email-accounts/${account._id}/forwarding`, { forwardingEnabled, forwardTo: forwardingEnabled ? forwardTo : '' });
      toast.success('Forwarding updated');
    } catch (e) { toast.error('Failed to update forwarding'); }
    finally { setForwardingSaving(false); }
  };

  const handleAddBlockedSender = async () => {
    if (!newBlockedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBlockedEmail)) { toast.error('Enter a valid email'); return; }
    setBlockedLoading(true);
    try {
      const res = await api.post(`/email-accounts/${account._id}/blocked-senders`, { email: newBlockedEmail });
      if (res.data.success) { setBlockedSenders(res.data.blockedSenders); setNewBlockedEmail(''); toast.success('Sender blocked'); }
    } catch (e) { toast.error('Failed to block sender'); }
    finally { setBlockedLoading(false); }
  };

  const handleRemoveBlockedSender = async (email) => {
    setBlockedLoading(true);
    try {
      const res = await api.delete(`/email-accounts/${account._id}/blocked-senders/${encodeURIComponent(email)}`);
      if (res.data.success) { setBlockedSenders(res.data.blockedSenders); toast.success('Sender unblocked'); }
    } catch (e) { toast.error('Failed to unblock sender'); }
    finally { setBlockedLoading(false); }
  };

  const handleSaveWorkspace = async () => {
    setSaving(true);
    try {
      await api.put('/company/settings', workspaceForm);
      setWorkspaceData(prev => ({ ...prev, ...workspaceForm }));
      setEditingWorkspace(false);
      toast.success('Workspace updated');
    } catch (e) { toast.error('Failed to update workspace'); }
    finally { setSaving(false); }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await api.put('/users/preferences', preferences);
      toast.success('Preferences saved');
    } catch (e) { toast.error('Failed to save preferences'); }
    finally { setSaving(false); }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const res = await api.post('/billing/purchase', {
        emailCredits: purchaseAmount,
        amount: calculatePrice(purchaseAmount)
      });
      if (res.data.success) {
        setBillingData(prev => ({
          ...prev,
          emailCredits: (prev?.emailCredits || 0) + purchaseAmount,
          totalPurchased: (prev?.totalPurchased || 0) + purchaseAmount,
          lastPurchase: new Date().toISOString()
        }));
        setShowPurchaseModal(false);
        toast.success('Email credits purchased successfully!');
      }
    } catch (e) { toast.error('Purchase failed. Please try again.'); }
    finally { setPurchasing(false); }
  };

  const storagePercent = storageUsage ? Math.min((storageUsage.used / storageUsage.total) * 100, 100) : 0;

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your mailbox, workspace, billing and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start gap-0.5 bg-transparent border-b border-border rounded-none p-0 h-auto">
          <TabsTrigger value="mailbox" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-2">
            <Mail className="h-4 w-4" />
            Mailbox
          </TabsTrigger>
          <TabsTrigger value="workspace" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-2">
            <Building2 className="h-4 w-4" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-2">
            <CreditCard className="h-4 w-4" />
            Billing & Credits
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* ==================== MAILBOX TAB ==================== */}
        <TabsContent value="mailbox">
          {!account ? (
            <div className="text-center py-16 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-base">No email account selected</p>
              <p className="text-sm mt-1">Select an email account from the dropdown to manage its settings</p>
            </div>
          ) : (
            <div className="space-y-5 mt-6">
              {/* Profile Card */}
              <div className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card shadow-sm">
                <div className="relative group">
                  <img src={avatarSrc} alt="Avatar" className="w-16 h-16 rounded-full object-cover ring-2 ring-border" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  >
                    <Upload className="h-5 w-5 text-white" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground truncate">{displayName}</h3>
                  <p className="text-sm text-muted-foreground truncate">{account?.email}</p>
                  {(uploadError || uploadSuccess) && (
                    <p className={`text-xs mt-1 ${uploadError ? 'text-destructive' : 'text-emerald-600'}`}>{uploadError || uploadSuccess}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant={account?.imapEnabled !== false ? 'success' : 'destructive'}>
                    {account?.imapEnabled !== false ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{account?.domain}</span>
                </div>
              </div>

              {/* Sender Name */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground">Sender Name</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Appears as "From" when sending. Falls back to company name ({workspaceData.name}) if not set.
                    </p>
                  </div>
                  {!editingDisplayName && (
                    <Button variant="ghost" size="sm" onClick={() => { setNewDisplayName(account?.displayName || ''); setEditingDisplayName(true); }} className="shrink-0">
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                  )}
                </div>
                {editingDisplayName ? (
                  <div className="flex gap-2 mt-3">
                    <Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder={workspaceData.name || 'Enter sender name'} autoFocus className="max-w-sm" />
                    <Button size="sm" onClick={handleDisplayNameSave} disabled={displayNameSaving}>
                      <Save className="h-3.5 w-3.5 mr-1.5" />{displayNameSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingDisplayName(false)}>Cancel</Button>
                  </div>
                ) : (
                  <p className="text-sm mt-3 text-foreground font-medium">
                    {account?.displayName || <span className="text-muted-foreground font-normal italic">Using: {workspaceData.name}</span>}
                  </p>
                )}
              </div>

              {/* Signature */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">Email Signature</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Create a rich HTML signature — auto-appended to every outgoing email</p>
                <SignatureEditor
                  value={signature}
                  onChange={setSignature}
                  onSave={handleSignatureSave}
                  saving={signatureSaving}
                  account={account}
                />
              </div>

              {/* Storage & Details Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Storage */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-foreground">Storage</h4>
                  </div>
                  {storageLoading ? (
                    <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
                  ) : storageUsage ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">{(storageUsage.used / (1024 * 1024)).toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">MB used of {(storageUsage.total / (1024 * 1024)).toFixed(0)} MB</span>
                      </div>
                      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${storagePercent > 90 ? 'bg-destructive' : storagePercent > 70 ? 'bg-amber-500' : 'bg-primary'}`}
                          style={{ width: `${storagePercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{storagePercent.toFixed(0)}% used</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Storage info unavailable</p>
                  )}
                </div>

                {/* Account Details */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Account Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">IMAP</span>
                      <Badge variant={account?.imapEnabled !== false ? 'success' : 'destructive'} className="text-xs">
                        {account?.imapEnabled !== false ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">SMTP</span>
                      <Badge variant={account?.smtpEnabled !== false ? 'success' : 'destructive'} className="text-xs">
                        {account?.smtpEnabled !== false ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Domain</span>
                      <span className="text-sm font-medium">{account?.domain || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gravatar */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">Gravatar</h4>
                </div>
                {gravatarChecking ? (
                  <p className="text-sm text-muted-foreground">Checking...</p>
                ) : (
                  <div className="flex items-center gap-4">
                    {gravatarUrl && <img src={gravatarUrl} alt="Gravatar" className="w-12 h-12 rounded-full ring-2 ring-border" />}
                    <div className="flex-1">
                      <Badge variant={hasCustomGravatar ? 'success' : 'secondary'}>
                        {hasCustomGravatar ? 'Connected' : 'Not Set Up'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {hasCustomGravatar ? 'Your Gravatar is used as your profile picture' : 'Set up a Gravatar for a universal profile picture'}
                      </p>
                    </div>
                    {!hasCustomGravatar && (
                      <Button variant="outline" size="sm" onClick={() => openGravatarSetup(user?.email || account?.email)}>Set Up</Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ==================== WORKSPACE TAB ==================== */}
        <TabsContent value="workspace">
          <div className="space-y-5 mt-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Company / Workspace</h4>
                  <p className="text-xs text-muted-foreground mt-1">Your company name is used as the default sender name for all mailboxes</p>
                </div>
                {!editingWorkspace ? (
                  <Button variant="ghost" size="sm" onClick={() => { setWorkspaceForm({ name: workspaceData.name, description: workspaceData.description, type: workspaceData.type }); setEditingWorkspace(true); }}>
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveWorkspace} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingWorkspace(false)}>Cancel</Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <Label className="text-xs text-muted-foreground">Company Name</Label>
                  {editingWorkspace ? (
                    <Input value={workspaceForm.name || ''} onChange={(e) => setWorkspaceForm(p => ({ ...p, name: e.target.value }))} className="mt-1.5" />
                  ) : (
                    <p className="text-sm font-medium mt-1.5">{workspaceData.name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  {editingWorkspace ? (
                    <select
                      value={workspaceForm.type || 'Business'}
                      onChange={(e) => setWorkspaceForm(p => ({ ...p, type: e.target.value }))}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Business">Business</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  ) : (
                    <p className="text-sm font-medium mt-1.5">{workspaceData.type}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  {editingWorkspace ? (
                    <Input value={workspaceForm.description || ''} onChange={(e) => setWorkspaceForm(p => ({ ...p, description: e.target.value }))} className="mt-1.5" />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1.5">{workspaceData.description || '—'}</p>
                  )}
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid grid-cols-3 gap-5">
                <div className="text-center p-3 rounded-lg bg-secondary/40">
                  <p className="text-xs text-muted-foreground mb-1">Plan</p>
                  <p className="text-sm font-semibold">{workspaceData.plan}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/40">
                  <p className="text-xs text-muted-foreground mb-1">Members</p>
                  <p className="text-sm font-semibold">{workspaceData.teamMembers}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/40">
                  <p className="text-xs text-muted-foreground mb-1">Storage</p>
                  <p className="text-sm font-semibold">
                    {workspaceData.storageUsed >= 1024
                      ? `${(workspaceData.storageUsed / 1024).toFixed(1)}GB`
                      : `${workspaceData.storageUsed || 0}MB`
                    } / {workspaceData.storageTotal}GB
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ==================== BILLING & CREDITS TAB ==================== */}
        <TabsContent value="billing">
          <div className="space-y-5 mt-6">
            {/* Credit Balance */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-card to-secondary/20 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">Email Credits</h4>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-4xl font-bold text-foreground tracking-tight">{(billingData?.emailCredits || 0).toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">credits available</span>
                  </div>
                </div>
                <Button onClick={() => setShowPurchaseModal(true)} className="gap-1.5">
                  <ShoppingCart className="h-4 w-4" /> Buy Credits
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-6">
                {[
                  { label: 'This Month', value: emailUsage?.thisMonth || 0 },
                  { label: 'Last Month', value: emailUsage?.lastMonth || 0 },
                  { label: 'Total Used', value: billingData?.totalUsed || 0 },
                  { label: 'Purchased', value: billingData?.totalPurchased || 0 }
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 rounded-lg bg-background/60 border border-border/50">
                    <p className="text-xl font-bold text-foreground">{stat.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-foreground">Pricing</h4>
              <p className="text-xs text-muted-foreground mt-1">Simple, pay-as-you-go. No monthly fees.</p>

              <div className="flex items-center gap-6 mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div>
                  <span className="text-3xl font-bold text-primary">$0.30</span>
                  <span className="text-sm text-muted-foreground ml-1">/ 1,000 emails</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {['No subscription', 'Credits never expire', 'Full tracking', 'Campaign analytics'].map(f => (
                    <span key={f} className="flex items-center gap-1"><Check className="h-3 w-3 text-primary" />{f}</span>
                  ))}
                </div>
              </div>

              <h4 className="text-sm font-semibold text-foreground mt-6 mb-3">Quick Purchase</h4>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {emailPackages.map(pkg => (
                  <button
                    key={pkg.emails}
                    onClick={() => { setPurchaseAmount(pkg.emails); setShowPurchaseModal(true); }}
                    className={`relative flex flex-col items-center p-3 rounded-lg border transition-all cursor-pointer hover:border-primary hover:shadow-md ${
                      pkg.popular ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background'
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full whitespace-nowrap">Popular</span>
                    )}
                    <span className="text-base font-bold text-foreground">{(pkg.emails / 1000).toFixed(0)}K</span>
                    <span className="text-[11px] text-muted-foreground">emails</span>
                    <span className="text-xs font-semibold text-primary mt-1">${calculatePrice(pkg.emails)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Purchase History */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-foreground mb-3">Purchase History</h4>
              {billingData?.lastPurchase ? (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                  <span className="text-sm">{new Date(billingData.lastPurchase).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="text-xs text-muted-foreground">Last purchase</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No purchases yet</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ==================== SECURITY TAB ==================== */}
        <TabsContent value="security">
          {!account ? (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-base">Select an email account to manage security</p>
            </div>
          ) : (
            <div className="space-y-3 mt-6">
              {/* Password Reset */}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary"><Lock className="h-4 w-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-semibold">Password Reset</p>
                      <p className="text-xs text-muted-foreground">Change the password for {account?.email}</p>
                    </div>
                  </div>
                  {showPasswordSection ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {showPasswordSection && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                    <div>
                      <Label className="text-xs font-medium">New Password</Label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="mt-1.5 max-w-sm" />
                      {passwordStrength && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex gap-1">
                            <div className={`h-1.5 w-10 rounded-full ${passwordStrength === 'weak' ? 'bg-destructive' : passwordStrength === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            <div className={`h-1.5 w-10 rounded-full ${passwordStrength === 'medium' || passwordStrength === 'strong' ? (passwordStrength === 'medium' ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-secondary'}`} />
                            <div className={`h-1.5 w-10 rounded-full ${passwordStrength === 'strong' ? 'bg-emerald-500' : 'bg-secondary'}`} />
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">{passwordStrength}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Confirm Password</Label>
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="mt-1.5 max-w-sm" />
                    </div>
                    <Button size="sm" onClick={handlePasswordSave} disabled={passwordSaving}>
                      {passwordSaving ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Forwarding */}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowForwardingSection(!showForwardingSection)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary"><Forward className="h-4 w-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-semibold">Email Forwarding</p>
                      <p className="text-xs text-muted-foreground">Automatically forward incoming emails</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {forwardingEnabled && <Badge variant="success" className="text-xs">On</Badge>}
                    {showForwardingSection ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
                {showForwardingSection && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable Forwarding</Label>
                      <Switch checked={forwardingEnabled} onCheckedChange={setForwardingEnabled} />
                    </div>
                    {forwardingEnabled && (
                      <div>
                        <Label className="text-xs font-medium">Forward To</Label>
                        <Input type="email" value={forwardTo} onChange={(e) => setForwardTo(e.target.value)} placeholder="recipient@example.com" className="mt-1.5 max-w-sm" />
                      </div>
                    )}
                    <Button size="sm" onClick={handleForwardingSave} disabled={forwardingSaving}>
                      {forwardingSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Blocked Senders */}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowBlockedSection(!showBlockedSection)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary"><Ban className="h-4 w-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-semibold">Blocked Senders</p>
                      <p className="text-xs text-muted-foreground">Block emails from specific addresses</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {blockedSenders.length > 0 && <Badge variant="secondary" className="text-xs">{blockedSenders.length}</Badge>}
                    {showBlockedSection ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
                {showBlockedSection && (
                  <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
                    <div className="flex gap-2">
                      <Input type="email" value={newBlockedEmail} onChange={(e) => setNewBlockedEmail(e.target.value)} placeholder="spam@example.com" className="max-w-sm" />
                      <Button size="sm" onClick={handleAddBlockedSender} disabled={blockedLoading}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Block
                      </Button>
                    </div>
                    {blockedLoading ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : blockedSenders.length > 0 ? (
                      <div className="space-y-1.5">
                        {blockedSenders.map((email, i) => (
                          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/40">
                            <span className="text-sm">{email}</span>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveBlockedSender(email)} className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No blocked senders</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ==================== PREFERENCES TAB ==================== */}
        <TabsContent value="preferences">
          <div className="mt-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
              <h4 className="text-sm font-semibold text-foreground mb-4">Email Preferences</h4>

              {[
                { key: 'defaultTracking', title: 'Default Tracking', desc: 'Enable tracking by default for new campaigns' },
                { key: 'emailNotifications', title: 'Email Notifications', desc: 'Receive email notifications for campaign completions' },
                { key: 'weeklyReports', title: 'Weekly Reports', desc: 'Receive weekly email performance reports' },
                { key: 'lowCreditAlert', title: 'Low Credit Alert', desc: 'Get notified when credits fall below 1,000' }
              ].map((pref, idx) => (
                <React.Fragment key={pref.key}>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{pref.title}</p>
                      <p className="text-xs text-muted-foreground">{pref.desc}</p>
                    </div>
                    <Switch checked={preferences[pref.key]} onCheckedChange={(v) => setPreferences(p => ({ ...p, [pref.key]: v }))} />
                  </div>
                  {idx < 3 && <Separator />}
                </React.Fragment>
              ))}

              <div className="pt-3">
                <Button onClick={handleSavePreferences} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Purchase Modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Purchase Email Credits
            </DialogTitle>
            <DialogDescription>Select how many email credits you'd like to purchase</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <Label className="text-sm font-medium">Number of Emails</Label>
              <Input
                type="number"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(Math.max(1000, parseInt(e.target.value) || 0))}
                min="1000"
                step="1000"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum 1,000 emails</p>
            </div>

            <div className="rounded-lg bg-secondary/40 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email Credits</span>
                <span className="font-medium">{purchaseAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per 1,000</span>
                <span className="font-medium">${PRICE_PER_1000.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary">${calculatePrice(purchaseAmount)}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
              <div className="flex gap-3">
                <label className="flex-1 flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input type="radio" name="payment" value="card" defaultChecked className="accent-primary" />
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Card</span>
                </label>
                <label className="flex-1 flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input type="radio" name="payment" value="paypal" className="accent-primary" />
                  <span className="text-sm font-semibold text-blue-600">PP</span>
                  <span className="text-sm">PayPal</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handlePurchase} disabled={purchasing} className="w-full">
              {purchasing ? 'Processing...' : `Pay $${calculatePrice(purchaseAmount)}`}
            </Button>
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" /> Secure payment powered by Stripe
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MailSettings;
