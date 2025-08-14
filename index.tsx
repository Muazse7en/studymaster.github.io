
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from '@google/genai';
import LoginPage from './src/components/LoginPage';

// --- ICONS (Phosphor-style, line-art, 1.5px stroke) ---
const Icon = (props: React.SVGProps<SVGSVGElement> & {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props} />;
const IconMenu = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></Icon>;
const IconPlus = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M12 5v14m-7-7h14" /></Icon>;
const IconPencil = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M17.5 2.5a2.5 2.5 0 0 1 3.5 3.5L8.5 18.5 4 19l.5-4.5L17.5 2.5z" /></Icon>;
const IconTrash = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M20 6H4m14 0a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2m-1 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6m4-6v6" /></Icon>;
const IconUser = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-7 9c0-4 6-5 7-5s7 1 7 5" /></Icon>;
const IconSignOut = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" /></Icon>;
const IconSettings = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M12 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm0 6a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 0a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm0-6a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm0-6a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" /></Icon>;
const IconBell = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9m-3.73 13a2 2 0 0 1-3.46 0" /></Icon>;
const IconCalendar = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M3 4.5h18v15H3v-15zM16 2.5v4M8 2.5v4M3 9.5h18" /></Icon>;
const IconUpload = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7-5-5-5 5m5-5v12" /></Icon>;
const IconX = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M6 18 18 6M6 6l12 12" /></Icon>;
const IconPaperclip = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></Icon>;
const IconGlobe = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></Icon>;
const IconSend = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="m22 2-7 20-4-9-9-4 20-7z" /></Icon>;
const IconArrowsOut = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M15 3h6v6m-11 5L21 3m-6 12v6h-6m-5-11L3 21" /></Icon>;
const IconArrowsIn = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></Icon>;
const IconReset = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M3 2v6h6m12 12v-6h-6m0-6A9 9 0 0 0 6 5.3L3 8m15 6.7A9 9 0 0 0 21 8" /></Icon>;
const IconDoc = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" /><path d="M14 2v6h6M16 13H8m8 4H8m-2-8H8" /></Icon>;
const IconAppearance = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M12 3a9 9 0 1 0 0 18Z M12 3a9 9 0 1 1 0 18Z M12 3v18" /></Icon>;
const IconData = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M12 21a9 9 0 0 1-9-9c0-4.968 4.032-9 9-9s9 4.032 9 9-4.032 9-9 9z M7 14h10 M7 10h10" /></Icon>;
const IconInfo = (props: React.SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20ZM12,10a1,1,0,0,0-1,1v4a1,1,0,0,0,2,0V11A1,1,0,0,0,12,10ZM11,7h2v2H11Z" transform="scale(1.2) translate(-2, -2)" fill="currentColor" strokeWidth="0"/></Icon>;

const SYSTEM_INSTRUCTION = `You are 'Study Master', an expert AI tutor. 
You will be provided with text and often images from study documents. Your knowledge base for the session is an combination of all the documents.
When answering, use the provided materials as your primary source. Use Markdown for clear formatting (headings, lists, bold text, and tables). Do not just give the answer; explain the reasoning and the underlying concepts as a great teacher would.
If you are using web search, you MUST cite your sources. List the source links clearly below your answer. Your answer must be based on the information from those sources.
When asked for structured data like JSON, provide only the JSON object.
Be a supportive and encouraging study partner.`;

// --- New User Interfaces ---
interface Credentials {
  username: string;
  password?: string; // Password is used for creation/validation, but not stored in currentUser
  role: 'admin' | 'student';
}

interface CurrentUser {
    username: string;
    role: 'admin' | 'student';
}

interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: { uri: string; title: string }[];
}

interface CalendarEvent {
  id: number;
  subjectId: number | null;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  description: string;
}

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  subjectId: number | null;
}

interface Notification {
  id: number;
  eventId: number;
  message: string;
  date: string; // ISO string
  read: boolean;
}

interface DocumentImage {
    name: string;
    data: string; // base64 data URI
    caption: string;
}

interface Document {
  name: string;
  content: string;
  images: DocumentImage[];
}

interface Subject {
  id: number;
  name: string;
  documents: Document[];
  isDocSaved: boolean;
  chat: Chat | null;
  messages: Message[];
}

interface FlashcardData {
  term: string;
  definition: string;
}

interface MindMapNodeData {
    id: string; // e.g. "root-0-1"
    concept: string;
    children?: MindMapNodeData[];
}

type Feature = 'summary' | 'questions' | 'workout' | 'did-you-know' | 'flashcards' | 'mind-map' | 'key-takeaways' | 'figures';
type Theme = 'light' | 'dark';

// Helper type for parsed PDF data
interface ExtractedPdfData {
    extractedText: string;
    extractedImages: { name: string; caption: string; imageData: string }[];
}

const getBase64Util = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); });

const DocumentManagerModal = ({
    subject,
    isOpen,
    onClose,
    onSave,
    aiInstance
}: {
    subject: Subject;
    isOpen: boolean;
    onClose: () => void;
    onSave: (newDocs: Document[]) => Promise<void>;
    aiInstance: GoogleGenAI;
}) => {
    const [docs, setDocs] = useState<Document[]>(subject.documents);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pastedText, setPastedText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(isOpen) {
            setDocs(subject.documents);
        }
    }, [isOpen, subject.documents]);

    if (!isOpen) return null;

    const handleSaveClick = async () => {
        if (JSON.stringify(docs) === JSON.stringify(subject.documents)) {
            onClose();
            return;
        }
        await onSave(docs);
        onClose();
    };

    const handleRemoveDocument = (docNameToRemove: string) => {
        setDocs(currentDocs => currentDocs.filter(d => d.name !== docNameToRemove));
    };

    const handleAddPastedText = () => {
        if (!pastedText.trim()) return;
        let docName = 'Pasted Content';
        let counter = 1;
        while (docs.some(d => d.name === docName)) {
            docName = `Pasted Content ${++counter}`;
        }
        const newDoc: Document = { name: docName, content: pastedText.trim(), images: [] };
        setDocs(currentDocs => [...currentDocs, newDoc]);
        setPastedText('');
    };
    
    const getTextAndImagesFromPdf = async (file: File): Promise<{text: string; images: DocumentImage[]}> => {
        const base64Data = await getBase64Util(file);
        const pdfPart = { inlineData: { data: base64Data.split(',')[1], mimeType: 'application/pdf' } };
        const instructionPart = { text: "Analyze the provided PDF and extract its contents into the required JSON format. This includes all text and all meaningful images/diagrams." };
        try {
            const response = await aiInstance.models.generateContent({
                model: "gemini-2.5-flash", contents: { parts: [instructionPart, pdfPart] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT, properties: {
                            extractedText: { type: Type.STRING, description: 'All text extracted from the PDF, preserving structure and formatting like headings and paragraphs.' },
                            extractedImages: { type: Type.ARRAY, description: 'An array of all diagrams, figures, and images found in the PDF. IMPORTANT: Only include meaningful figures, ignore logos or decorative elements.',
                                items: { type: Type.OBJECT, properties: {
                                        name: { type: Type.STRING, description: 'A descriptive name for the image, like "Figure 1.1". If no name is available, create one.' },
                                        caption: { type: Type.STRING, description: 'The original caption of the image from the document, if available. Otherwise, an empty string.' },
                                        imageData: { type: Type.STRING, description: 'The image data encoded as a Base64 string, without the data URI prefix.' }
                                    }, required: ["name", "caption", "imageData"]
                                }
                            }
                        }, required: ["extractedText", "extractedImages"]
                    }
                },
            });
            const parsedData = JSON.parse(response.text) as ExtractedPdfData;
            if (!parsedData.extractedText || !Array.isArray(parsedData.extractedImages)) throw new Error("Parsed JSON has incorrect structure.");
            const images = (parsedData.extractedImages || []).map((img: { name: string; caption: string; imageData: string }) => ({
                name: img.name || 'Untitled Figure', caption: img.caption || '',
                data: `data:image/png;base64,${img.imageData}`
            })).filter((img: DocumentImage) => img.data.length > 30);
            return { text: parsedData.extractedText, images };
        } catch (error) {
            console.error("Failed to parse PDF with image extraction, falling back to text-only extraction.", error);
            const textOnlyResponse = await aiInstance.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [ { text: 'Extract all text from the provided PDF document.' }, pdfPart] }});
            return { text: textOnlyResponse.text, images: [] };
        }
    };
    
    const getTextFromImage = async (file: File): Promise<string> => {
        const base64Data = await getBase64Util(file);
        const imagePart = { inlineData: { data: base64Data.split(',')[1], mimeType: file.type } };
        const textPart = { text: 'Extract all text from the document in this image.' };
        const response = await aiInstance.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [imagePart, textPart] } });
        return response.text;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files: File[] = Array.from(e.target.files);
        e.target.value = ''; // Clear the input
        setIsProcessing(true);
        for (const file of files) {
            try {
                if (docs.some(d => d.name === file.name)) { 
                    alert(`A document named "${file.name}" already exists. Please rename the file and try again.`); 
                    continue; 
                }
                let documentText = ''; 
                let documentImages: DocumentImage[] = [];

                if (file.type.startsWith('image/')) {
                    documentText = await getTextFromImage(file);
                    const base64Data = await getBase64Util(file);
                    documentImages = [{ name: file.name, data: base64Data, caption: 'Uploaded image' }];
                } else if (file.type === 'application/pdf') {
                    const { text, images } = await getTextAndImagesFromPdf(file);
                    documentText = text; 
                    documentImages = images;
                } else if (file.type.startsWith('text/') || file.name.endsWith('.md')) { 
                    documentText = await file.text();
                } else { 
                    alert(`Unsupported file type: ${file.type || 'unknown'}.`); 
                    continue; 
                }
                
                if (documentText.trim() || documentImages.length > 0) {
                    const newDoc: Document = { name: file.name, content: documentText, images: documentImages };
                    setDocs(current => [...current, newDoc]);
                } else { 
                    alert(`Could not extract any content from "${file.name}".`); 
                }
            } catch (error) { 
                console.error('Error processing file:', error); 
                alert(`Failed to process the file: ${file.name}.`); 
            }
        }
        setIsProcessing(false);
    };

    return (
        <div className="overlay" onClick={onClose}>
            <div className="modal document-management-modal" style={{maxWidth: '800px'}} onClick={e => e.stopPropagation()}>
                <header className="modal__header">
                    <h2>Manage Study Materials</h2>
                    <button className="btn btn--icon" onClick={onClose} aria-label="Close"><IconX className="icon icon--md" /></button>
                </header>
                <div className="modal__content">
                    {isProcessing && ( <div className="document-processing-overlay"> <div className="loading-spinner"></div> <p>Analyzing documents...</p> </div> )}
                    <div className="document-list-container">
                        <h3>Loaded Documents ({docs.length})</h3>
                        <div className="document-list">
                            {docs.map(doc => ( <div key={doc.name} className="document-item" title={doc.name}> <IconDoc className="icon icon--md doc-icon"/> <span className="doc-name">{doc.name}</span> <small className="doc-size">{(doc.content.length / 1024).toFixed(1)} KB</small> <button className="btn btn--icon doc-remove-btn" onClick={() => handleRemoveDocument(doc.name)} title={`Remove ${doc.name}`}><IconTrash className="icon icon--sm" /></button> </div> ))}
                            {docs.length === 0 && ( <p className="no-docs-message">No documents added yet.</p> )}
                        </div>
                    </div>
                    <div className="document-add-container">
                        <div className="document-upload-controls">
                             <h4>Upload Files</h4>
                             <p><small>Upload images, PDFs, or text files.</small></p>
                            <button className="btn btn--secondary" onClick={() => fileInputRef.current?.click()}> <IconUpload className="icon icon--sm" /> Upload from Device </button>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} accept=".txt,.md,text/plain,image/jpeg,image/png,image/webp,.pdf,application/pdf" multiple />
                        </div>
                        <div className="document-paste-controls">
                            <h4>Paste Text</h4>
                            <p><small>Or paste your notes directly.</small></p>
                            <textarea className="input-field" placeholder="Paste content here..." value={pastedText} onChange={(e) => setPastedText(e.target.value)} />
                            <button className="btn btn--secondary" onClick={handleAddPastedText} disabled={!pastedText.trim()}>Add Pasted Text</button>
                        </div>
                    </div>
                </div>
                <footer className="modal__footer">
                    <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn--primary" onClick={handleSaveClick} disabled={isProcessing}>
                        {isProcessing ? 'Processing...' : 'Save & Update Session'}
                    </button>
                </footer>
            </div>
        </div>
    );
};


const Flashcard: React.FC<FlashcardData> = ({ term, definition }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
        <div className={`flashcard ${isFlipped ? 'is-flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
            <div className="flashcard-inner">
                <div className="flashcard-front">{term}</div>
                <div className="flashcard-back">{definition}</div>
            </div>
        </div>
    );
};

interface InteractiveMindMapNodeProps {
    node: MindMapNodeData & { x: number, y: number };
    isCollapsed: boolean;
    onToggle: (id: string) => void;
}

const InteractiveMindMapNode: React.FC<InteractiveMindMapNodeProps> = ({ node, isCollapsed, onToggle }) => {
    const hasChildren = node.children && node.children.length > 0;
    return (
        <div className="interactive-mind-map-node" style={{ transform: `translate(${node.x}px, ${node.y}px)` }}>
            {hasChildren && (
                <button className="node-toggle-btn" onClick={() => onToggle(node.id)}>
                    {isCollapsed ? '+' : '-'}
                </button>
            )}
            <div className="node-concept-text">{node.concept}</div>
        </div>
    );
};

const MindMapViewer = ({ node }: { node: MindMapNodeData }) => {
    const [transform, setTransform] = useState({ scale: 1, x: 50, y: 50 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
    const [collapsedNodes, setCollapsedNodes] = useState(new Set<string>());
    
    const NODE_HEIGHT = 60;
    const NODE_WIDTH = 200;
    const HORIZONTAL_SPACING = 280;
    const VERTICAL_SPACING = 20;

    const { nodes, connectors, width, height } = useMemo(() => {
        const positionedNodes: (MindMapNodeData & {x: number, y: number, parentId: string | null})[] = [];
        const positionedConnectors: { from: {x:number, y:number}, to: {x:number, y:number} }[] = [];
        let maxDepth = 0;

        function layout(n: MindMapNodeData, depth: number, parentId: string | null = null, yOffset = 0): { y: number, height: number } {
            const isCollapsed = collapsedNodes.has(n.id);
            maxDepth = Math.max(maxDepth, depth);
            let childY = yOffset;
            let childrenHeight = 0;

            if (!isCollapsed && n.children) {
                n.children.forEach(child => {
                    const { height } = layout(child, depth + 1, n.id, childY);
                    childY += height;
                    childrenHeight += height;
                });
            }
            
            const nodeHeight = NODE_HEIGHT + (childrenHeight > 0 ? childrenHeight - VERTICAL_SPACING : 0);
            const nodeY = childrenHeight > 0 ? yOffset + (childrenHeight - NODE_HEIGHT) / 2 : yOffset;
            const nodeX = depth * HORIZONTAL_SPACING;

            positionedNodes.push({ ...n, x: nodeX, y: nodeY, parentId });
            
            if (parentId) {
                const parentNode = positionedNodes.find(p => p.id === parentId);
                if(parentNode) {
                   positionedConnectors.push({
                       from: { x: parentNode.x + NODE_WIDTH, y: parentNode.y + NODE_HEIGHT / 2 },
                       to: { x: nodeX, y: nodeY + NODE_HEIGHT / 2 }
                   });
                }
            }
            return { y: nodeY, height: nodeHeight + VERTICAL_SPACING };
        }

        const { height: totalHeight } = layout(node, 0);
        const mapWidth = (maxDepth * HORIZONTAL_SPACING) + NODE_WIDTH + 50;
        const mapHeight = totalHeight;

        return { nodes: positionedNodes, connectors: positionedConnectors, width: mapWidth, height: mapHeight };
    }, [node, collapsedNodes]);

    const handleToggleNode = (id: string) => {
        setCollapsedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); const zoomFactor = 1.1; const newScale = e.deltaY < 0 ? transform.scale * zoomFactor : transform.scale / zoomFactor; setTransform(t => ({ ...t, scale: Math.max(0.2, Math.min(3, newScale)) })); };
    const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); setIsPanning(true); setStartPanPoint({ x: e.clientX - transform.x, y: e.clientY - transform.y }); };
    const handleMouseMove = (e: React.MouseEvent) => { if (!isPanning) return; e.preventDefault(); setTransform(t => ({...t, x: e.clientX - startPanPoint.x, y: e.clientY - startPanPoint.y})); };
    const handleMouseUpOrLeave = () => setIsPanning(false);
    const zoom = (factor: number) => setTransform(t => ({ ...t, scale: Math.max(0.2, Math.min(3, t.scale * factor))}));
    const resetTransform = () => setTransform({ scale: 1, x: 50, y: 50 });

    return (
        <div
            className={`mind-map-viewer ${isPanning ? 'panning' : ''}`}
            onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave}
        >
            <div
                className="mind-map-pannable"
                style={{ 
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    width: `${width}px`,
                    height: `${height}px`,
                }}
            >
               <svg className="mind-map-svg-layer" width="100%" height="100%">
                    {connectors.map((c, i) => {
                        const d = `M ${c.from.x} ${c.from.y} C ${c.from.x + HORIZONTAL_SPACING / 2} ${c.from.y}, ${c.to.x - HORIZONTAL_SPACING / 2} ${c.to.y}, ${c.to.x} ${c.to.y}`;
                        return <path key={i} className="mind-map-connector" d={d} />;
                    })}
                </svg>
                {nodes.map(n => (
                    <InteractiveMindMapNode key={n.id} node={n} isCollapsed={collapsedNodes.has(n.id)} onToggle={handleToggleNode} />
                ))}
            </div>
             <div className="mind-map-controls">
                <button onClick={() => zoom(1.2)} title="Zoom In"><IconPlus className="icon icon--sm"/></button>
                <button onClick={() => zoom(1 / 1.2)} title="Zoom Out">-</button>
                <button onClick={resetTransform} title="Reset View"><IconReset className="icon icon--sm"/></button>
            </div>
        </div>
    );
};

const EventEditorModal = ({
    isOpen,
    event,
    subjects,
    onClose,
    onSave,
    onDelete,
}: {
    isOpen: boolean;
    event: Partial<CalendarEvent> | null;
    subjects: Subject[];
    onClose: () => void;
    onSave: (event: Omit<CalendarEvent, 'id'> & { id?: number }) => void;
    onDelete: (eventId: number) => void;
}) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [subjectId, setSubjectId] = useState<string>('');

    useEffect(() => {
        if (isOpen && event) {
            setTitle(event.title || '');
            setDate(event.date || new Date().toISOString().split('T')[0]);
            setTime(event.time || '');
            setDescription(event.description || '');
            setSubjectId(event.subjectId?.toString() || '');
        } else {
            // Reset for new event
            setTitle('');
            setDate(new Date().toISOString().split('T')[0]);
            setTime('');
            setDescription('');
            setSubjectId('');
        }
    }, [isOpen, event]);

    if (!isOpen) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !date) return;
        onSave({
            id: event?.id,
            title: title.trim(),
            date,
            time,
            description,
            subjectId: subjectId ? parseInt(subjectId, 10) : null,
        });
    };

    const handleDelete = () => {
        if (event?.id && window.confirm('Are you sure you want to delete this event?')) {
            onDelete(event.id);
        }
    };

    return (
        <div className="overlay" onClick={onClose}>
            <div className="modal event-editor-modal" style={{maxWidth: '600px'}} onClick={e => e.stopPropagation()}>
                <header className="modal__header">
                    <h2>{event?.id ? 'Edit Event' : 'Add New Event'}</h2>
                    <button className="btn btn--icon" onClick={onClose}><IconX className="icon icon--md" /></button>
                </header>
                <form onSubmit={handleSave} className="modal__content">
                    <div className="form-group">
                        <label htmlFor="event-title">Title</label>
                        <input id="event-title" className="input-field" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Midterm Exam" required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="event-date">Date</label>
                            <input id="event-date" className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="event-time">Time (Optional)</label>
                            <input id="event-time" className="input-field" type="time" value={time} onChange={e => setTime(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="event-subject">Subject (Optional)</label>
                        <select id="event-subject" className="input-field" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                            <option value="">General</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="event-description">Description (Optional)</label>
                        <textarea id="event-description" className="input-field" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Chapters 4-7" />
                    </div>
                    <footer className="modal__footer">
                        {event?.id && <button type="button" className="btn btn--danger" onClick={handleDelete} style={{marginRight: 'auto'}}>Delete Event</button>}
                        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn--primary">Save Event</button>
                    </footer>
                </form>
            </div>
        </div>
    );
};


const CalendarView = ({
    events,
    todos,
    subjects,
    onClose,
    onAddOrEditEvent,
    onSaveTodo,
    onDeleteTodo,
    onToggleTodo,
}: {
    events: CalendarEvent[];
    todos: TodoItem[];
    subjects: Subject[];
    onClose: () => void;
    onAddOrEditEvent: (event: Partial<CalendarEvent> | null) => void;
    onSaveTodo: (todo: Omit<TodoItem, 'id' | 'completed'> & { id?: number }) => void;
    onDeleteTodo: (todoId: number) => void;
    onToggleTodo: (todoId: number) => void;
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'calendar' | 'agenda'>('calendar');
    const [newTodoText, setNewTodoText] = useState('');
    const [newTodoSubjectId, setNewTodoSubjectId] = useState<string>('');

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    const days = Array.from({ length: startDay }, (_, i) => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

    const getSubjectName = (subjectId: number | null) => {
        if (subjectId === null) return 'General';
        return subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';
    };

    const handleAddTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTodoText.trim()) return;
        onSaveTodo({ text: newTodoText.trim(), subjectId: newTodoSubjectId ? parseInt(newTodoSubjectId, 10) : null });
        setNewTodoText('');
        setNewTodoSubjectId('');
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEvents = events
        .filter(event => new Date(event.date + 'T00:00:00') >= today)
        .sort((a,b) => a.date.localeCompare(b.date) || (a.time || '23:59').localeCompare(b.time || '23:59'));

    return (
        <div className="overlay" onClick={onClose}>
            <div className="modal calendar-modal" style={{maxWidth: '1100px'}} onClick={e => e.stopPropagation()}>
                <header className="modal__header calendar-header">
                    <div className="calendar-header-top">
                        <div className="calendar-title-and-nav">
                            <h2>{currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}</h2>
                            <div className="calendar-nav">
                                <button className='btn btn--secondary' onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>&lt;</button>
                                <button className='btn btn--secondary' onClick={() => setCurrentDate(new Date())}>Today</button>
                                <button className='btn btn--secondary' onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>&gt;</button>
                            </div>
                        </div>
                        <button className="btn btn--icon" onClick={onClose}><IconX className="icon icon--md" /></button>
                    </div>
                    <div className="calendar-tabs">
                        <button className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>Calendar</button>
                        <button className={`tab-btn ${activeTab === 'agenda' ? 'active' : ''}`} onClick={() => setActiveTab('agenda')}>Agenda & To-Do</button>
                    </div>
                </header>
                <div className="calendar-body">
                    {activeTab === 'calendar' && (
                        <div className="calendar-grid">
                            {'Sun,Mon,Tue,Wed,Thu,Fri,Sat'.split(',').map(day => <div key={day} className="day-name">{day}</div>)}
                            {days.map((day, index) => {
                                const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                                const eventsForDay = day ? events.filter(e => e.date === dateStr).sort((a,b) => (a.time || '23:59').localeCompare(b.time || '23:59')) : [];
                                const isToday = day && today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth() && today.getDate() === day;
                                return (
                                    <div key={index} className={`day-cell ${!day ? 'empty' : ''} ${isToday ? 'today' : ''}`}>
                                        {day && <div className="day-number">{day}</div>}
                                        <div className="events-in-day">
                                            {eventsForDay.map(event => (
                                                <div key={event.id} className="event-marker" title={`${event.title} (${getSubjectName(event.subjectId)})`} onClick={() => onAddOrEditEvent(event)}>
                                                    <span className="event-title">{event.time && `${event.time} - `}{event.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {activeTab === 'agenda' && (
                        <div className="agenda-view">
                            <div className="agenda-section">
                                <h3>Upcoming Events</h3>
                                {upcomingEvents.length > 0 ? (
                                    <ul className="agenda-list">
                                        {upcomingEvents.map(event => (
                                            <li key={`event-${event.id}`} className="agenda-item event-item" onClick={() => onAddOrEditEvent(event)}>
                                                <div className="agenda-item-date">
                                                    <span>{new Date(event.date + 'T00:00:00').toLocaleString('default', { day: 'numeric' })}</span>
                                                    <small>{new Date(event.date + 'T00:00:00').toLocaleString('default', { month: 'short' })}</small>
                                                </div>
                                                <div className="agenda-item-details">
                                                    <span className="agenda-item-title">{event.title}</span>
                                                    <small className="agenda-item-sub">{event.time || 'All-day'} &middot; {getSubjectName(event.subjectId)}</small>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (<p className="empty-list-message">No upcoming events.</p>)}
                            </div>
                            <div className="agenda-section">
                                <h3>To-Do List</h3>
                                <form onSubmit={handleAddTodo} className="add-todo-form">
                                    <input type="text" className="input-field" value={newTodoText} onChange={e => setNewTodoText(e.target.value)} placeholder="Add a new to-do item..." />
                                    <select className="input-field" value={newTodoSubjectId} onChange={e => setNewTodoSubjectId(e.target.value)}>
                                        <option value="">General</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <button type="submit" className="btn btn--primary">+</button>
                                </form>
                                {todos.length > 0 ? (
                                    <ul className="agenda-list todo-list">
                                        {[...todos].sort((a,b) => Number(a.completed) - Number(b.completed)).map(todo => (
                                            <li key={`todo-${todo.id}`} className={`agenda-item todo-item ${todo.completed ? 'completed' : ''}`}>
                                                <input type="checkbox" id={`todo-cb-${todo.id}`} checked={todo.completed} onChange={() => onToggleTodo(todo.id)} />
                                                <label htmlFor={`todo-cb-${todo.id}`} className="custom-checkbox"></label>
                                                <div className="agenda-item-details">
                                                    <span className="agenda-item-title">{todo.text}</span>
                                                    <small className="agenda-item-sub">{getSubjectName(todo.subjectId)}</small>
                                                </div>
                                                <button className="btn btn--icon" style={{marginLeft: 'auto'}} onClick={() => onDeleteTodo(todo.id)}><IconTrash className="icon icon--sm" /></button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (<p className="empty-list-message">Your to-do list is empty. Add one above!</p>)}
                            </div>
                        </div>
                    )}
                </div>
                <footer className="modal__footer">
                    <button className="btn btn--primary" onClick={() => onAddOrEditEvent(null)}><IconPlus className="icon icon--sm" /> Add Calendar Event</button>
                </footer>
            </div>
        </div>
    );
};

const SettingsModal = ({
    isOpen,
    onClose,
    onBackup,
    onRestore,
    onClearData,
    fontSize,
    onSetFontSize,
    theme,
    onSetTheme,
    currentUser,
    users,
    onUserCreate,
    onUserDelete,
}: {
    isOpen: boolean;
    onClose: () => void;
    onBackup: () => void;
    onRestore: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearData: () => void;
    fontSize: string;
    onSetFontSize: (size: 'small' | 'medium' | 'large') => void;
    theme: Theme;
    onSetTheme: (theme: Theme) => void;
    currentUser: CurrentUser | null;
    users: Credentials[];
    onUserCreate: (username: string, pass: string) => void;
    onUserDelete: (username: string) => void;
}) => {
    const [activeTab, setActiveTab] = useState('appearance');
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setActiveTab('appearance'); // Reset tab on close
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const handleUserCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUserCreate(newUsername, newPassword);
        setNewUsername('');
        setNewPassword('');
    };

    const navItems = [
      { id: 'appearance', label: 'Appearance', icon: IconAppearance },
      { id: 'data', label: 'Data Management', icon: IconData },
      ...(currentUser?.role === 'admin' ? [{ id: 'users', label: 'User Management', icon: IconUser }] : []),
      { id: 'about', label: 'About', icon: IconInfo },
    ];


    return (
        <div className="overlay" onClick={onClose}>
            <div className="modal settings-modal" style={{maxWidth: '900px', height: '700px'}} onClick={e => e.stopPropagation()}>
                <header className="modal__header">
                    <h2>Settings</h2>
                    <button className="btn btn--icon" onClick={onClose} aria-label="Close"><IconX className="icon icon--md" /></button>
                </header>
                <div className="modal__content">
                    <nav className="settings-nav">
                      {navItems.map(item => (
                         <a key={item.id} className={`settings-nav__link ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
                            <item.icon className="icon icon--md" />
                            <span>{item.label}</span>
                         </a>
                      ))}
                    </nav>
                    <div className="settings-content">
                    {activeTab === 'appearance' && (
                        <div className="settings-section">
                            <h3>Appearance</h3>
                            <p>Customize the look and feel of the application.</p>
                            <div className="setting-item">
                                <div className="setting-item__label">
                                    <strong>Theme</strong>
                                    <span>Switch between light and dark mode.</span>
                                </div>
                                <div className="setting-item__control">
                                   <label className="theme-switch">
                                      <input type="checkbox" checked={theme === 'dark'} onChange={(e) => onSetTheme(e.target.checked ? 'dark' : 'light')} />
                                      <span className="theme-switch__slider"></span>
                                   </label>
                                </div>
                            </div>
                            <div className="setting-item">
                                <div className="setting-item__label">
                                  <strong>Font Size</strong>
                                  <span>Adjust the application's font size.</span>
                                </div>
                                <div className="setting-item__control">
                                    <button className={`btn btn--secondary ${fontSize === 'small' ? 'active' : ''}`} onClick={() => onSetFontSize('small')}>Small</button>
                                    <button className={`btn btn--secondary ${fontSize === 'medium' ? 'active' : ''}`} onClick={() => onSetFontSize('medium')}>Medium</button>
                                    <button className={`btn btn--secondary ${fontSize === 'large' ? 'active' : ''}`} onClick={() => onSetFontSize('large')}>Large</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'data' && (
                        <div className="settings-section">
                            <h3>Data Management</h3>
                            <p>Save or restore your user data. Restore will overwrite current data.</p>
                            <div className="setting-item">
                                <div className="setting-item__label">
                                  <strong>Backup & Restore</strong>
                                  <span>Save all subjects, chats, and events to a file.</span>
                                </div>
                                <div className="setting-item__control">
                                    <button className="btn btn--secondary" onClick={onBackup}>Download Backup</button>
                                    <input type="file" accept=".json" ref={restoreInputRef} style={{display: 'none'}} onChange={onRestore} />
                                    <button className="btn btn--secondary" onClick={() => restoreInputRef.current?.click()}>Upload & Restore</button>
                                </div>
                            </div>
                             <div className="setting-item">
                                 <div className="setting-item__label">
                                  <strong style={{color: 'var(--color-state-error)'}}>Clear All Data</strong>
                                  <span>Permanently delete all data for this user.</span>
                                 </div>
                                 <button className="btn btn--danger" onClick={onClearData}>
                                    Clear Data
                                 </button>
                             </div>
                        </div>
                    )}
                    {activeTab === 'users' && currentUser?.role === 'admin' && (
                        <div className="settings-section">
                            <h3>User Management</h3>
                            <p>Create and manage student user accounts.</p>
                             <form onSubmit={handleUserCreateSubmit} className="user-management-form" style={{display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '24px'}}>
                                <div className="form-group" style={{flex: 1}}>
                                    <label>New Username</label>
                                    <input className="input-field" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" required />
                                </div>
                                <div className="form-group" style={{flex: 1}}>
                                    <label>Password</label>
                                    <input className="input-field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" required />
                                </div>
                                <button type="submit" className="btn btn--primary">Create</button>
                            </form>
                            
                            <table className="user-list-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.username}>
                                            <td>{user.username}</td>
                                            <td>{user.role}</td>
                                            <td>
                                                {user.role !== 'admin' && (
                                                    <button className="btn btn--danger" onClick={() => onUserDelete(user.username)}>Delete</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'about' && (
                        <div className="settings-section">
                            <h3>About Study Master</h3>
                            <p>
                                Study Master is your personal AI-powered study partner, designed to help you understand your course material more effectively.
                                Upload your documents, get summaries, generate flashcards and mind maps, and chat with an AI tutor that's focused on your content.
                            </p>
                            <p style={{marginTop: '1rem'}}>Version: 3.1.0 (Design System Overhaul)</p>
                            <p style={{marginTop: '1rem'}}>Created by: Muhammadu Muaz</p>
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NotificationCenter = ({
    isOpen,
    notifications,
    onClose,
    onMarkAsRead,
    onClearAll
}: {
    isOpen: boolean;
    notifications: Notification[];
    onClose: () => void;
    onMarkAsRead: (id: number) => void;
    onClearAll: () => void;
}) => {
    if (!isOpen) return null;

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="notification-panel-wrapper">
             <div className="notification-panel" onClick={e => e.stopPropagation()}>
                <header className="modal__header notification-header">
                    <h3>Notifications ({unreadCount})</h3>
                    <button className='btn btn--ghost' onClick={onClearAll} disabled={notifications.length === 0}>Clear All</button>
                </header>
                <div className="notification-list">
                    {notifications.length > 0 ? (
                        notifications.map(n => (
                            <div key={n.id} className={`notification-item ${n.read ? 'read' : ''}`} onClick={() => onMarkAsRead(n.id)}>
                                <div className="notification-icon"><IconBell className="icon icon--md" /></div>
                                <div className="notification-content">
                                    <p>{n.message}</p>
                                    <small>{new Date(n.date).toLocaleString()}</small>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-notifications">No new notifications.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

const App = () => {
  const apiKey = import.meta.env?.VITE_API_KEY;

  if (!apiKey) {
    return (
      <div className="fullscreen-error-container">
        <div className="error-panel">
          <h1>Configuration Error: API Key Missing</h1>
          <p>
            The Study Master application requires a Google Gemini API key to function, but it could not be found.
          </p>
          <div className="error-instructions">
            <h2>For Developers & Setup</h2>
            <p>
              This is expected if you are setting up the project for the first time or running it incorrectly. Please follow these steps:
            </p>
            <ol>
              <li>In the main project folder, create a new file named exactly <code>.env</code></li>
              <li>Inside this <code>.env</code> file, add the following line, replacing <code>YOUR_API_KEY_HERE</code> with your actual key:
                <pre><code>VITE_API_KEY=YOUR_API_KEY_HERE</code></pre>
              </li>
              <li>
                <strong>Most Important:</strong> You must run this app with the Vite development server. Open a terminal in the project folder and run:
                <pre><code>npm install<br/>npm run dev</code></pre>
              </li>
              <li>Then, open the <code>http://localhost:...</code> URL it gives you in your browser.</li>
            </ol>
            <p className="error-warning">
              You cannot run this application by simply opening the <code>index.html</code> file directly.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);  
  const [loginError, setLoginError] = useState<string | null>(null);
  const [users, setUsers] = useState<Credentials[]>([]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
  const [featureContent, setFeatureContent] = useState<string | any[] | object | null>(null);
  const [isGeneratingFeature, setIsGeneratingFeature] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEventEditorOpen, setIsEventEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isDocManagerOpen, setIsDocManagerOpen] = useState(false);
  
  const [isInternetSearchEnabled, setIsInternetSearchEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<Theme>('dark');
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMobileView, setActiveMobileView] = useState<'chat' | 'tools'>('chat');


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ai = useMemo(() => new GoogleGenAI({ apiKey }), [apiKey]);
  
  // Apply theme and font size to the root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [theme, fontSize]);

  // Load users from localStorage on initial mount and merge defaults
  useEffect(() => {
    const defaultUsers: Credentials[] = [
      { username: 'admin', password: 'admin', role: 'admin' as const },
      { username: 'Nilfa', password: 'Mznil169', role: 'student' as const },
      { username: 'Nimran', password: 'Nimran987654', role: 'student' as const }
    ];

    try {
      const storedUsersJSON = localStorage.getItem('studymaster_users');
      const existingUsers: Credentials[] = storedUsersJSON ? JSON.parse(storedUsersJSON) : [];
      const updatedUsers = [...existingUsers];
      const existingUsernames = new Set(existingUsers.map(u => u.username));
      let needsUpdate = false;

      defaultUsers.forEach(defaultUser => {
        if (!existingUsernames.has(defaultUser.username)) {
          updatedUsers.push(defaultUser);
          needsUpdate = true;
        }
      });
      
      if (needsUpdate || !storedUsersJSON) {
        localStorage.setItem('studymaster_users', JSON.stringify(updatedUsers));
      }
      setUsers(updatedUsers);

    } catch (e) {
      console.error("Failed to load/merge users from localStorage, re-initializing with defaults.", e);
      localStorage.setItem('studymaster_users', JSON.stringify(defaultUsers));
      setUsers(defaultUsers);
    }
    setIsLoadingAuth(false);
  }, []);

  // Effect to load data when user changes
  useEffect(() => {
    if (currentUser) {
      try {
        const storedData = localStorage.getItem(`studymaster_data_${currentUser.username}`);
        if (storedData) {
          const data = JSON.parse(storedData);
          const restoredSubjects: Subject[] = (data.subjects || []).map((s: Omit<Subject, 'chat'>) => ({
            ...s,
            chat: null,
            documents: (s.documents || []).map((d: Document) => ({ ...d, images: d.images || [] }))
          }));
          setSubjects(restoredSubjects);
          setEvents(data.events || []);
          setTodos(data.todos || []);
          setNotifications(data.notifications || []);
          if (data.settings) {
            setTheme(data.settings.theme || 'dark');
            setFontSize(data.settings.fontSize || 'medium');
          }
          setActiveSubjectId(restoredSubjects[0]?.id || null);
        } else {
          setSubjects([]); setEvents([]); setTodos([]); setNotifications([]);
          setActiveSubjectId(null); setTheme('dark'); setFontSize('medium');
        }
      } catch (e) {
        console.error("Failed to load user data, resetting state.", e);
        setSubjects([]); setEvents([]); setTodos([]); setNotifications([]); setActiveSubjectId(null);
      }
    }
  }, [currentUser]);

  // Effect to save data whenever it changes for the current user
  useEffect(() => {
    if (currentUser) {
        try {
            const dataToSave = {
                subjects: subjects.map(({ chat, ...rest }) => rest),
                events, todos, notifications,
                settings: { theme, fontSize }
            };
            localStorage.setItem(`studymaster_data_${currentUser.username}`, JSON.stringify(dataToSave));
        } catch (error) {
            console.error(`Failed to save data for user ${currentUser.username}`, error);
        }
    }
  }, [currentUser, subjects, events, todos, notifications, theme, fontSize]);

  const handleLogin = (username: string, password: string) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser({ username: user.username, role: user.role });
      setLoginError(null);
    } else {
      setLoginError('Invalid username or password.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSubjects([]); setEvents([]); setTodos([]); setNotifications([]); setActiveSubjectId(null);
  };
  
  const handleCreateUser = (username: string, pass: string) => {
      if (!username.trim() || !pass.trim()) { alert("Username and password cannot be empty."); return; }
      if (users.some(u => u.username === username)) { alert("Username already exists."); return; }
      const newUser: Credentials = { username, password: pass, role: 'student' };
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('studymaster_users', JSON.stringify(updatedUsers));
  };
  
  const handleDeleteUser = (usernameToDelete: string) => {
      if (usernameToDelete === 'admin') { alert("Cannot delete the admin user."); return; }
      if (window.confirm(`Are you sure you want to delete user "${usernameToDelete}"? All their data will be lost.`)) {
          const updatedUsers = users.filter(u => u.username !== usernameToDelete);
          setUsers(updatedUsers);
          localStorage.setItem('studymaster_users', JSON.stringify(updatedUsers));
          localStorage.removeItem(`studymaster_data_${usernameToDelete}`);
      }
  };

  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  
  const buildInitialChatParts = (subject: Subject): any[] => {
    const reminders = getUpcomingEventsPrompt(subject.id);
    const contentParts: any[] = [{ text: reminders + `Here are the study documents for our session on "${subject.name}":` }];
    subject.documents.forEach(doc => {
        contentParts.push({ text: `\n\n--- DOCUMENT: ${doc.name} ---\n\n${doc.content}` });
        (doc.images || []).forEach(img => {
            contentParts.push({ text: `\nImage from ${doc.name} - Name: ${img.name}, Caption: ${img.caption}\n` });
            contentParts.push({ inlineData: { data: img.data.split(',')[1], mimeType: img.data.match(/:(.*?);/)?.[1] || 'image/png' } });
        });
    });
    return contentParts;
  }

  const getUpcomingEventsPrompt = (subjectId: number | null): string => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const oneWeekFromNow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    const upcomingEvents = events.filter(event => {
        const [year, month, day] = event.date.split('-').map(Number);
        const eventDate = new Date(year, month - 1, day);
        return (event.subjectId === subjectId || event.subjectId === null) && eventDate >= today && eventDate <= oneWeekFromNow;
    });
    if (upcomingEvents.length === 0) return '';
    let prompt = 'SYSTEM NOTE FOR AI: The user has the following deadlines/exams for this subject. Be proactive and help them prepare for these specific events.\n';
    upcomingEvents.forEach(event => { prompt += `- Title: ${event.title}, Date: ${event.date} at ${event.time || 'All Day'}. Description: ${event.description || 'N/A'}\n`; });
    return prompt;
  };
  
  const handleAddSubjectClick = () => { setIsAddingSubject(true); setNewSubjectName(''); };
  const handleCancelAddSubject = () => { setIsAddingSubject(false); };
  
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubjectName.trim()) {
        const newSubject: Subject = { id: Date.now(), name: newSubjectName.trim(), documents: [], isDocSaved: false, chat: null, messages: [] };
        const newSubjects = [newSubject, ...subjects];
        setSubjects(newSubjects);
        setActiveSubjectId(newSubject.id);
        setNewSubjectName('');
        setIsAddingSubject(false);
    }
  };

  const handleDeleteSubject = (e: React.MouseEvent, subjectIdToDelete: number) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
        const newSubjects = subjects.filter(s => s.id !== subjectIdToDelete);
        setSubjects(newSubjects);
        setEvents(events.filter(ev => ev.subjectId !== subjectIdToDelete));
        setTodos(todos.filter(t => t.subjectId !== subjectIdToDelete));
        if (activeSubjectId === subjectIdToDelete) { setActiveSubjectId(newSubjects.length > 0 ? newSubjects[0].id : null); }
    }
  };
  
  const handleEnableEditing = (e: React.MouseEvent, subjectId: number) => { e.stopPropagation(); setEditingSubjectId(subjectId); };
  const handleSubjectNameUpdate = (subjectId: number, newName: string) => {
      if (newName.trim()) { setSubjects(subjects.map(s => s.id === subjectId ? { ...s, name: newName.trim() } : s)); }
      setEditingSubjectId(null);
  };
  
  const updateSubject = (id: number, updates: Partial<Subject>) => { setSubjects(subjects.map(s => s.id === id ? { ...s, ...updates } : s)); };
  
  const handleSaveDocument = async () => {
    if (!activeSubject || activeSubject.documents.length === 0) {
        alert("Please add some documents first.");
        return;
    }
    setIsLoading(true);
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: SYSTEM_INSTRUCTION },
        });

        const initialMessageParts = [
            ...buildInitialChatParts(activeSubject),
            { text: "\n\nAcknowledge you have received and understood the documents and are ready to begin the study session." }
        ];

        const result = await chat.sendMessage({ message: initialMessageParts });

        const greetingMessage = result.text || "Great, I've read the document(s). I'm ready to help you study. Ask me anything or select a feature to get started!";
        const modelMessage: Message = { role: 'model', text: greetingMessage };

        updateSubject(activeSubject.id, { chat, isDocSaved: true, messages: [modelMessage] });

    } catch (error) {
        console.error('Failed to initialize chat:', error);
        const errorStr = error instanceof Error ? error.message : JSON.stringify(error);
        alert('Failed to initialize chat session:\n' + errorStr);
    } finally {
        setIsLoading(false);
    }
  };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || !activeSubject || isLoading || (!activeSubject.chat && !isInternetSearchEnabled)) { return; }
        
        setActiveMobileView('chat');
        const text = userInput;
        setUserInput('');
        setIsLoading(true);
        const userMessage: Message = { role: 'user', text };
        const modelPlaceholder: Message = { role: 'model', text: '' };
        setSubjects(currentSubjects => currentSubjects.map(s => s.id === activeSubjectId ? { ...s, messages: [...s.messages, userMessage, modelPlaceholder] } : s));
        try {
            let modelResponse = ''; 
            let finalResponse: GenerateContentResponse | null = null;
            if (isInternetSearchEnabled) {
                const historyForSearch = activeSubject.messages.map(msg => ({ role: msg.role as 'user' | 'model', parts: [{ text: msg.text }] }));
                historyForSearch.push({ role: 'user', parts: [{ text }] });
                const stream = await ai.models.generateContentStream({ model: 'gemini-2.5-flash', contents: historyForSearch, config: { tools: [{ googleSearch: {} }], systemInstruction: SYSTEM_INSTRUCTION }, });
                for await (const chunk of stream) {
                    modelResponse += chunk.text; 
                    finalResponse = chunk;
                    setSubjects(currentSubjects => currentSubjects.map(s => {
                        if (s.id === activeSubjectId) { const updatedMessages = [...s.messages]; updatedMessages[updatedMessages.length - 1] = { ...updatedMessages[updatedMessages.length - 1], text: modelResponse }; return { ...s, messages: updatedMessages }; }
                        return s;
                    }));
                }
            } else if (activeSubject.chat) {
                const stream = await activeSubject.chat.sendMessageStream({ message: text });
                for await (const chunk of stream) {
                    modelResponse += chunk.text; 
                    finalResponse = chunk;
                    setSubjects(currentSubjects => currentSubjects.map(s => {
                        if (s.id === activeSubjectId) { const updatedMessages = [...s.messages]; updatedMessages[updatedMessages.length - 1] = { ...updatedMessages[updatedMessages.length - 1], text: modelResponse }; return { ...s, messages: updatedMessages }; }
                        return s;
                    }));
                }
            }
            const sources = finalResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web).filter((c: any) => c?.uri && c?.title);
            const finalModelMessage: Message = { role: 'model', text: modelResponse, sources };
            setSubjects(currentSubjects => currentSubjects.map(s => {
                if (s.id === activeSubjectId) { const updatedMessages = s.messages.slice(0, -2); return { ...s, messages: [...updatedMessages, userMessage, finalModelMessage] }; }
                return s;
            }));
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = { role: 'model', text: 'Sorry, something went wrong. Please try again.' };
            setSubjects(currentSubjects => currentSubjects.map(s => {
                if (s.id === activeSubjectId) { const updatedMessages = s.messages.slice(0, -1); updatedMessages.push(errorMessage); return { ...s, messages: updatedMessages }; }
                return s;
            }));
        } finally { setIsLoading(false); }
    };

    const extractJsonFromString = (text: string): string | null => {
        const firstBracket = text.indexOf('{'); 
        const firstSquare = text.indexOf('['); 
        let startIndex = -1;
        if (firstBracket !== -1 && firstSquare !== -1) startIndex = Math.min(firstBracket, firstSquare);
        else if (firstBracket !== -1) startIndex = firstBracket;
        else startIndex = firstSquare;
        if (startIndex === -1) return null;
        const lastBracket = text.lastIndexOf('}'); 
        const lastSquare = text.lastIndexOf(']');
        let endIndex = -1;
        if (lastBracket !== -1 && lastSquare !== -1) endIndex = Math.max(lastBracket, lastSquare);
        else if (lastBracket !== -1) endIndex = lastBracket;
        else endIndex = lastSquare;
        if (endIndex === -1 || endIndex < startIndex) return null;
        return text.substring(startIndex, endIndex + 1);
    };

    const markdownToHtml = (text: string): string => {
        if (!text) return ''; 
        let html = ''; 
        let inList = false; 
        let inTable = false;
        const formatLine = (l: string) => l.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
        for (const line of text.split('\n')) {
            const trimmedLine = line.trim();
            if (trimmedLine === '') { if (inTable) { html += '</tbody></table>'; inTable = false; } if (inList) { html += '</ul>'; inList = false; } continue; }
            const isTableRow = trimmedLine.startsWith('|') && trimmedLine.endsWith('|');
            const isSeparator = isTableRow && /^\s*\|?(\s*:?-+:?\s*\|)+(\s*:?-+:?\s*)?\|?\s*$/.test(trimmedLine);
            if (isTableRow && !isSeparator) {
                if (inList) { html += '</ul>'; inList = false; }
                const columns = trimmedLine.slice(1, -1).split('|').map(c => formatLine(c.trim()));
                if (!inTable) { html += '<table><thead><tr>'; columns.forEach(col => { html += `<th>${col}</th>`; }); html += '</tr></thead><tbody>'; inTable = true;
                } else { html += '<tr>'; columns.forEach(col => { html += `<td>${col}</td>`; }); html += '</tr>'; }
                continue;
            }
            if (inTable && !isSeparator) { html += '</tbody></table>'; inTable = false; }
            if (inTable && isSeparator) continue;
            if (trimmedLine.startsWith('# ')) { if (inList) { html += '</ul>'; inList = false; } html += `<h1>${formatLine(trimmedLine.substring(2))}</h1>`; continue; }
            if (trimmedLine.startsWith('## ')) { if (inList) { html += '</ul>'; inList = false; } html += `<h2>${formatLine(trimmedLine.substring(3))}</h2>`; continue; }
            if (trimmedLine.startsWith('### ')) { if (inList) { html += '</ul>'; inList = false; } html += `<h3>${formatLine(trimmedLine.substring(4))}</h3>`; continue; }
            const isList = trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ');
            if (isList) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${formatLine(trimmedLine.substring(trimmedLine.indexOf(' ')+1))}</li>`; continue; }
            if (inList) { html += '</ul>'; inList = false; }
            html += `<p>${formatLine(line)}</p>`;
        }
        if (inTable) html += '</tbody></table>'; 
        if (inList) html += '</ul>';
        return html;
    };

    const handleFeatureRequest = async (feature: Feature) => {
        setActiveMobileView('tools');
        if (feature === 'figures') {
            setActiveFeature('figures');
            const allImages = activeSubject?.documents.flatMap(doc => (doc.images || []).map(img => ({...img, docName: doc.name}))) || [];
            setFeatureContent(allImages);
            return;
        }
        if (!activeSubject?.chat || isGeneratingFeature) return;
        setActiveFeature(feature); 
        setIsGeneratingFeature(true); 
        setFeatureContent(null);
        let prompt = ''; 
        let isJson = false;
        switch (feature) {
            case 'summary': prompt = 'Provide a detailed summary of the document. Format your response using Markdown. Use headings (#, ##), bold text (**text**), and unordered lists (* item) for clarity.'; break;
            case 'questions': prompt = 'Generate 5 challenging multiple-choice questions based on the document to test my understanding. Format the questions and answers using Markdown (e.g., use **bold** for question numbers and headings for sections like "Answers"). Provide the answers and a brief explanation for each answer separately after the questions.'; break;
            case 'workout': prompt = "Create a 'workout' based on the document. This should include practice problems, key concepts to define, or short essay prompts. Format the response using Markdown with headings (#, ##) and bold text (**text**) to organize the content."; break;
            case 'did-you-know': prompt = 'Based on the document, generate a few interesting "Did you know?" style facts or trivia. Format each fact as a list item in Markdown (e.g., `* **Did you know?** ...`). These should be surprising or highlight non-obvious connections within the material.'; break;
            case 'key-takeaways': prompt = 'Extract the 3-5 most crucial, high-level conclusions or bullet points from the document. Present them as a concise Markdown list (using `* `).'; break;
            case 'flashcards': isJson = true; prompt = `Based on the document, generate a JSON array of 8 flashcards. Each object in the array must have a "term" and a "definition" key. Your response MUST be only the raw JSON array, starting with '[' and ending with ']'. Do not include any other text, explanations, or markdown formatting.`; break;
            case 'mind-map': isJson = true; prompt = `Generate a mind map of the document's content as a nested JSON object. The root object must have a "concept" key for the main idea, and a "children" key which is an array of objects. Each object, including the root, must have a unique "id" string. The children array should be empty if there are no sub-concepts, not omitted. Go about 3 levels deep. Your response MUST be only the raw JSON object, starting with '{' and ending with '}'.`; break;
        }
        try {
            const response = await activeSubject.chat.sendMessage({ message: prompt });
            if (isJson) {
                 try {
                    const jsonString = extractJsonFromString(response.text);
                    if (!jsonString) throw new Error("Could not find a valid JSON object or array in the AI's response.");
                    if (feature === 'flashcards') { setFeatureContent(JSON.parse(jsonString) as FlashcardData[]); } 
                    else if (feature === 'mind-map') { setFeatureContent(JSON.parse(jsonString) as MindMapNodeData); }
                    else { setFeatureContent(JSON.parse(jsonString)); }
                } catch (e) { console.error("JSON parsing error:", e, "\nOriginal text:\n", response.text); setFeatureContent(`Sorry, I couldn't generate the content correctly. The AI returned an invalid format.`); }
            } else { setFeatureContent(response.text); }
        } catch (error) { console.error(`Error generating ${feature}:`, error); setFeatureContent(`Sorry, I had trouble generating the ${feature}. Please try again.`);
        } finally { setIsGeneratingFeature(false); }
    };

    const handleDocumentsUpdate = async (newDocs: Document[]) => {
        if (!activeSubject) return;
        setIsLoading(true);
        try {
            const subjectWithNewDocs: Subject = { ...activeSubject, documents: newDocs };
    
            const newChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction: SYSTEM_INSTRUCTION },
            });
    
            const documentParts = buildInitialChatParts(subjectWithNewDocs);
            const historyParts = activeSubject.messages.flatMap(msg => {
                return [{ text: `\n\n--- PREVIOUS TURN ---\n${msg.role.toUpperCase()}: ${msg.text}\n--- END TURN ---\n` }];
            });
    
            const ackPromptPart = { text: "\n\n[SYSTEM NOTE] Your study documents have been updated. Re-read all provided documents and the previous conversation history. Then, briefly acknowledge the update to the user and await their next question."};
    
            const fullMessageParts = [ ...documentParts, ...historyParts, ackPromptPart ];
    
            const result = await newChat.sendMessage({ message: fullMessageParts });
    
            const modelMessage: Message = { role: 'model', text: result.text || "Okay, I've loaded the updated documents. How can I help?" };
            
            updateSubject(activeSubject.id, { documents: newDocs, chat: newChat, messages: [...activeSubject.messages, modelMessage] });
            
        } catch (error) { 
            console.error("Failed to restart chat session with updated documents:", error); 
            alert("Failed to update the study session. Please try again.");
        } finally { 
            setIsLoading(false); 
        }
    };

    const handleOpenEventEditor = (event: Partial<CalendarEvent> | null) => { setEditingEvent(event); setIsEventEditorOpen(true); };
    const handleSaveEvent = (eventData: Omit<CalendarEvent, 'id'> & { id?: number }) => {
        if (eventData.id) { setEvents(events.map(e => e.id === eventData.id ? { ...e, ...eventData } : e));
        } else { setEvents([...events, { ...eventData, id: Date.now() }]); }
        setIsEventEditorOpen(false); setEditingEvent(null);
    };
    const handleDeleteEvent = (eventId: number) => { setEvents(events.filter(e => e.id !== eventId)); setIsEventEditorOpen(false); setEditingEvent(null); };

    const handleSaveTodo = (todoData: Omit<TodoItem, 'id' | 'completed'> & { id?: number }) => {
        if (todoData.id) { setTodos(todos.map(t => t.id === todoData.id ? { ...t, ...todoData } as TodoItem : t));
        } else { setTodos([...todos, { ...todoData, id: Date.now(), completed: false }]); }
    };
    const handleDeleteTodo = (todoId: number) => { setTodos(todos.filter(t => t.id !== todoId)); };
    const handleToggleTodo = (todoId: number) => { setTodos(todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t)); };

    const handleMarkNotificationAsRead = (id: number) => { setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n)); };
    const handleClearAllNotifications = () => { setNotifications([]); };

    const handleBackup = () => {
        if (!currentUser) return;
        try {
            const dataToBackup = { subjects: subjects.map(({ chat, ...rest }) => rest), events, todos, notifications, settings: { theme, fontSize } };
            const jsonString = JSON.stringify(dataToBackup, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            a.download = `studymaster_backup_${currentUser.username}_${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) { console.error("Backup failed:", error); alert("Sorry, there was an error creating the backup file."); }
    };
    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result !== 'string') { throw new Error("File could not be read as text."); }
                const data = JSON.parse(result);
                if (data && Array.isArray(data.subjects) && Array.isArray(data.events)) {
                    if (window.confirm("Restoring will overwrite all current data for your user. Are you sure you want to continue?")) {
                        const restoredSubjects: Subject[] = data.subjects.map((s: Omit<Subject, 'chat'>) => ({ ...s, chat: null, documents: (s.documents || []).map((d: Document) => ({ ...d, images: d.images || [] })) }));
                        setSubjects(restoredSubjects);
                        setEvents(data.events);
                        setTodos(data.todos || []);
                        setNotifications(data.notifications || []);
                        if (data.settings) {
                            const validThemes: Theme[] = ['light', 'dark'];
                            if (validThemes.includes(data.settings.theme)) { setTheme(data.settings.theme as Theme); }
                            const validFontSizes = ['small', 'medium', 'large'];
                            if (validFontSizes.includes(data.settings.fontSize)) { setFontSize(data.settings.fontSize as 'small' | 'medium' | 'large'); }
                        }
                        setActiveSubjectId(restoredSubjects[0]?.id || null);
                        alert("Data restored successfully!");
                        setIsSettingsOpen(false);
                    }
                } else { throw new Error("Invalid backup file format."); }
            } catch (error) { console.error("Restore failed:", error); alert(`Restore failed. Error: ${error instanceof Error ? error.message : "Unknown error"}`); }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleClearAllData = () => {
        if (!currentUser) return;
        if (window.confirm(`This will permanently delete all subjects, chats, events, and to-dos for the user "${currentUser.username}". This action cannot be undone. Continue?`)) {
            setSubjects([]);
            setEvents([]);
            setTodos([]);
            setNotifications([]);
            setActiveSubjectId(null);
            localStorage.removeItem(`studymaster_data_${currentUser.username}`);
            setIsSettingsOpen(false);
        }
    };

    const renderFeatureContent = () => {
        if (isGeneratingFeature) { return ( <div className="feature-loading-view"> <div className="loading-spinner"></div> <p>Generating {activeFeature}...</p> </div> ); }
        if (!featureContent && activeFeature !== 'figures') { return ( <div className="feature-placeholder"> <h3>Study Tools</h3> <p>Select a feature to generate insights, or ask a question in chat.</p> </div> ); }
        switch (activeFeature) {
            case 'flashcards':
                 if (!Array.isArray(featureContent)) { return <div className="feature-content">{typeof featureContent === 'string' ? featureContent : 'Error: Invalid content for flashcards.'}</div>; }
                return ( <div className="flashcard-container"> {(featureContent as FlashcardData[]).map((card, index) => ( <Flashcard key={index} {...card} /> ))} </div> );
            case 'mind-map':
                if (typeof featureContent !== 'object' || featureContent === null || Array.isArray(featureContent)) { return <div className="feature-content">{typeof featureContent === 'string' ? featureContent : 'Error: Invalid content for mind map.'}</div>; }
                return <MindMapViewer node={featureContent as MindMapNodeData} />;
            case 'figures':
                if (!Array.isArray(featureContent) || featureContent.length === 0) { return ( <div className="feature-placeholder"> <h3>Figures & Diagrams</h3> <p>No figures or diagrams were found in the loaded documents.</p> </div> ); }
                return ( <div className="figure-gallery-container"> {(featureContent as (DocumentImage & {docName: string})[]).map((image, index) => ( <div key={index} className="figure-item"> <img src={image.data} alt={image.caption || image.name} /> <div className="figure-caption"> <strong>{image.name}</strong> {image.caption && <p>{image.caption}</p>} <small>From: {image.docName}</small> </div> </div> ))} </div> );
            case 'summary': case 'questions': case 'workout': case 'did-you-know': case 'key-takeaways':
                 if (typeof featureContent === 'string') { return <div className="feature-content" dangerouslySetInnerHTML={{ __html: markdownToHtml(featureContent) }}></div> }
                 return <div className="feature-content">Could not display content.</div>;
            default: return ( <div className="feature-placeholder"> <h3>Study Tools</h3> <p>Select a feature to generate insights, or ask a question in chat.</p> </div> );
        }
    };

    const renderSubjectView = () => {
        if (!activeSubject) {
          return ( <div className="welcome-view"> <div className="welcome-content"> <button className="btn btn--icon mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}> <IconMenu className="icon icon--lg" /> </button> <h2>Welcome to Study Master</h2> <p>Your AI-powered study partner. Select a subject or create a new one to begin.</p> </div> </div> );
        }
        return (
          <div className="subject-view">
            <header className="subject-header">
                <button className="btn btn--icon mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}> <IconMenu className="icon icon--lg" /> </button>
                <h2>{activeSubject.name}</h2>
                <div className="subject-header__actions">
                     <div className="notification-bell-wrapper">
                        <button className="btn btn--icon" onClick={() => setIsNotificationCenterOpen(prev => !prev)} title="Notifications">
                            <IconBell className="icon icon--md" />
                            {notifications.filter(n => !n.read).length > 0 && <span className="notification-badge"/>}
                        </button>
                        <NotificationCenter isOpen={isNotificationCenterOpen} notifications={notifications} onClose={() => setIsNotificationCenterOpen(false)} onMarkAsRead={handleMarkNotificationAsRead} onClearAll={handleClearAllNotifications} />
                    </div>
                    <button className="btn btn--icon" onClick={() => setIsCalendarOpen(true)} title="Open Calendar">
                        <IconCalendar className="icon icon--md" />
                    </button>
                </div>
            </header>

            {!activeSubject.isDocSaved ? (
                <div className="document-setup-view">
                  <div className="document-setup-area">
                    <h3>Upload Study Materials</h3>
                    <p>Add documents, notes, or images to start your session.</p>
                     <button className="btn btn--primary" onClick={() => setIsDocManagerOpen(true)}>
                        <IconUpload className="icon icon--sm"/> Manage Documents
                     </button>
                     <button 
                        className="btn btn--secondary" 
                        onClick={handleSaveDocument} 
                        disabled={activeSubject.documents.length === 0 || isLoading}> 
                        {isLoading ? 'Processing...' : `Start Study Session`} 
                    </button>
                  </div>
                </div>
            ) : (
              <div className="study-session-view">
                <div className="mobile-main-nav">
                    <button onClick={() => setActiveMobileView('chat')} className={activeMobileView === 'chat' ? 'active' : ''}>Chat</button>
                    <button onClick={() => setActiveMobileView('tools')} className={activeMobileView === 'tools' ? 'active' : ''}>Study Tools</button>
                </div>
                <div className={`study-content-area ${isChatFullscreen ? 'chat-fullscreen' : ''} view-on-mobile-${activeMobileView}`}>
                    <aside className="chat-container">
                        <div className="chat-header">
                            <h4>Chat Session</h4>
                            <button className="btn btn--icon" onClick={() => setIsChatFullscreen(prev => !prev)} title={isChatFullscreen ? "Show Feature Panel" : "Expand Chat"}>
                                {isChatFullscreen ? <IconArrowsIn className="icon icon--md" /> : <IconArrowsOut className="icon icon--md" />}
                            </button>
                        </div>
                        <div className="chat-messages">
                        {activeSubject.messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.role}`}>
                            <div className="message__content">
                                {msg.role === 'model' && msg.text === '' && isLoading ? ( <div className="loading-dots"> <div/><div/><div/><div/> </div> ) : ( <div dangerouslySetInnerHTML={{ __html: msg.role === 'model' ? markdownToHtml(msg.text) : msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}} /> )}
                                {msg.sources && msg.sources.length > 0 && ( <div className="message-sources"> <strong>Sources:</strong> <ul> {msg.sources.map((source, i) => ( <li key={i}> <a href={source.uri} target="_blank" rel="noopener noreferrer">{source.title || source.uri}</a> </li> ))} </ul> </div> )}
                            </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                        </div>
                        <form className="chat-input-form" onSubmit={handleSendMessage}>
                            <textarea
                                className="input-field chat-input"
                                placeholder={isInternetSearchEnabled ? "Ask a question (with internet search)..." : "Ask a question..."}
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e as any);
                                  }
                                }}
                                disabled={isLoading}
                                rows={1}
                            />
                            <div className="chat-input-actions">
                                <button type="button" className={`btn btn--icon internet-toggle-btn ${isInternetSearchEnabled ? 'active' : ''}`} onClick={() => setIsInternetSearchEnabled(!isInternetSearchEnabled)} title={isInternetSearchEnabled ? "Disable Internet Search" : "Enable Internet Search"} disabled={isLoading} > <IconGlobe className="icon icon--md" /> </button>
                                <button type="button" className="btn btn--icon" onClick={() => setIsDocManagerOpen(true)} title="Manage Documents"><IconPaperclip className="icon icon--md" /></button>
                                <button type="submit" className="btn btn--primary btn--icon" disabled={isLoading || !userInput.trim()}> <IconSend className="icon icon--md" /> </button>
                            </div>
                        </form>
                    </aside>
                    <main className="feature-display-area">
                      <div className="feature-toolbar">
                          <button className={`btn btn--secondary ${activeFeature === 'key-takeaways' ? 'active' : ''}`} onClick={() => handleFeatureRequest('key-takeaways')}>Takeaways</button>
                          <button className={`btn btn--secondary ${activeFeature === 'summary' ? 'active' : ''}`} onClick={() => handleFeatureRequest('summary')}>Summary</button>
                          <button className={`btn btn--secondary ${activeFeature === 'flashcards' ? 'active' : ''}`} onClick={() => handleFeatureRequest('flashcards')}>Flashcards</button>
                          <button className={`btn btn--secondary ${activeFeature === 'mind-map' ? 'active' : ''}`} onClick={() => handleFeatureRequest('mind-map')}>Mind Map</button>
                          <button className={`btn btn--secondary ${activeFeature === 'figures' ? 'active' : ''}`} onClick={() => handleFeatureRequest('figures')}>Figures</button>
                          <button className={`btn btn--secondary ${activeFeature === 'questions' ? 'active' : ''}`} onClick={() => handleFeatureRequest('questions')}>Questions</button>
                      </div>
                      <div className="feature-content-wrapper">
                        {renderFeatureContent()}
                      </div>
                    </main>
                </div>
              </div>
            )}
          </div>
        );
    };
  
  if (isLoadingAuth) {
    return ( <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#111111', color: 'white' }}> <div className="loading-spinner"/> </div> );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} error={loginError} />;
  }

  return (
    <>
      <div className={`mobile-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onBackup={handleBackup} 
        onRestore={handleRestore}
        onClearData={handleClearAllData} 
        fontSize={fontSize} 
        onSetFontSize={setFontSize} 
        theme={theme} 
        onSetTheme={setTheme}
        currentUser={currentUser}
        users={users}
        onUserCreate={handleCreateUser}
        onUserDelete={handleDeleteUser}
      />
      {isDocManagerOpen && activeSubject && (
        <DocumentManagerModal
          subject={activeSubject}
          isOpen={isDocManagerOpen}
          onClose={() => setIsDocManagerOpen(false)}
          onSave={handleDocumentsUpdate}
          aiInstance={ai}
        />
      )}
      {isCalendarOpen && (
        <CalendarView 
            events={events} 
            todos={todos}
            subjects={subjects} 
            onClose={() => setIsCalendarOpen(false)} 
            onAddOrEditEvent={handleOpenEventEditor} 
            onSaveTodo={handleSaveTodo}
            onDeleteTodo={handleDeleteTodo}
            onToggleTodo={handleToggleTodo}
        />
      )}
      {isEventEditorOpen && (
        <EventEditorModal isOpen={isEventEditorOpen} event={editingEvent} subjects={subjects} onClose={() => { setIsEventEditorOpen(false); setEditingEvent(null); }} onSave={handleSaveEvent} onDelete={handleDeleteEvent} />
      )}
      
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <header className="sidebar__header">
          <h1>Subjects</h1>
            <button className="btn btn--secondary" onClick={handleAddSubjectClick} disabled={isAddingSubject}> <IconPlus className="icon icon--sm" /> Add </button>
        </header>
        {isAddingSubject && (
          <form onSubmit={handleCreateSubject} className="add-subject-form">
            <input type="text" className="input-field" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="New subject name..." autoFocus />
            <div className="add-subject-actions">
              <button type="button" className="btn btn--secondary" onClick={handleCancelAddSubject}>Cancel</button>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        )}
        <ul className="subject-list">
          {subjects.map(subject => (
            <li 
              key={subject.id} 
              className={`subject-item ${subject.id === activeSubjectId ? 'active' : ''}`} 
              onClick={() => { setEditingSubjectId(null); setActiveSubjectId(subject.id); setIsSidebarOpen(false); }}
            >
              {editingSubjectId === subject.id ? (
                <input type="text" defaultValue={subject.name} className="subject-edit-input" autoFocus onBlur={(e) => handleSubjectNameUpdate(subject.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSubjectNameUpdate(subject.id, e.currentTarget.value); if (e.key === 'Escape') setEditingSubjectId(null); }} onClick={(e) => e.stopPropagation()} />
              ) : ( 
                <span className="subject-name">{subject.name}</span> 
              )}
              <div className="subject-item-actions">
                <button className="btn btn--icon" onClick={(e) => handleEnableEditing(e, subject.id)} title={`Rename "${subject.name}"`}>
                  <IconPencil className="icon icon--sm" />
                </button>
                <button className="btn btn--icon" onClick={(e) => handleDeleteSubject(e, subject.id)} title={`Delete "${subject.name}"`}>
                    <IconTrash className="icon icon--sm" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <footer className="sidebar__footer">
            <IconUser className="icon icon--md" />
            <span className="sidebar__footer-user">{currentUser.username}</span>
            <button className="btn btn--icon" onClick={handleLogout} title="Logout"><IconSignOut className="icon icon--md" /></button>
            <button className="btn btn--icon" onClick={() => setIsSettingsOpen(true)} title="Options"><IconSettings className="icon icon--md" /></button>
        </footer>
      </aside>
      
      <main className="main-content">
        {renderSubjectView()}
      </main>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
