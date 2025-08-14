import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from '@google/genai';
import LoginPage from './src/components/LoginPage';

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
type Theme = 'liquid-crystal' | 'deep-blue' | 'neon-green-blue' | 'neon-pink-purple' | 'neon-pink-orange';

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
            // Added type assertion here
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
        <div className="settings-overlay" onClick={onClose}>
            <div className="document-management-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>Manage Study Materials</h2>
                    <button className="close-modal-btn" onClick={onClose}>&times;</button>
                </header>
                <div className="modal-content">
                    {isProcessing && ( <div className="document-processing-overlay"> <div className="loading-spinner"></div> <p>Analyzing documents...</p> </div> )}
                    <div className="document-list-container">
                        <h3>Loaded Documents ({docs.length})</h3>
                        <ul className="document-list">
                            {docs.map(doc => ( <li key={doc.name} className="document-item" title={doc.name}> <span className="doc-icon">📄</span> <span className="doc-name">{doc.name}</span> <span className="doc-size">{(doc.content.length / 1024).toFixed(1)} KB</span> <button className="doc-remove-btn" onClick={() => handleRemoveDocument(doc.name)} title={`Remove ${doc.name}`}>&times;</button> </li> ))}
                            {docs.length === 0 && ( <p className="no-docs-message">No documents added yet.</p> )}
                        </ul>
                    </div>
                    <div className="document-add-container">
                        <div className="document-upload-controls">
                            <button className="upload-btn liquid-button" onClick={() => fileInputRef.current?.click()}> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Files </button>
                            <p className="upload-hint">Upload images, PDFs, or text files.</p>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} accept=".txt,.md,text/plain,image/jpeg,image/png,image/webp,.pdf,application/pdf" multiple />
                        </div>
                        <div className="document-paste-controls">
                            <textarea className="document-paste-area" placeholder="Or paste your notes here..." value={pastedText} onChange={(e) => setPastedText(e.target.value)} />
                            <button className="paste-add-btn liquid-button" onClick={handleAddPastedText} disabled={!pastedText.trim()}>Add Pasted Text</button>
                        </div>
                    </div>
                </div>
                <footer className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="save-doc-btn liquid-button" onClick={handleSaveClick} disabled={isProcessing}>
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
        <div className="flashcard" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}>
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
                <button onClick={() => zoom(1.2)} title="Zoom In">+</button>
                <button onClick={() => zoom(1 / 1.2)} title="Zoom Out">-</button>
                <button onClick={resetTransform} title="Reset View">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg>
                </button>
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
        <div className="calendar-overlay" onClick={onClose}>
            <div className="event-editor-modal" onClick={e => e.stopPropagation()}>
                <header className="event-editor-header">
                    <h2>{event?.id ? 'Edit Event' : 'Add New Event'}</h2>
                    <button className="close-modal-btn" onClick={onClose}>&times;</button>
                </header>
                <form onSubmit={handleSave} className="event-editor-form">
                    <div className="form-group">
                        <label htmlFor="event-title">Title</label>
                        <input id="event-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Midterm Exam" required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="event-date">Date</label>
                            <input id="event-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="event-time">Time (Optional)</label>
                            <input id="event-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="event-subject">Subject (Optional)</label>
                        <select id="event-subject" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                            <option value="">General</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="event-description">Description (Optional)</label>
                        <textarea id="event-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Chapters 4-7" />
                    </div>
                    <footer className="event-editor-footer">
                        {event?.id && <button type="button" className="btn-danger" onClick={handleDelete}>Delete Event</button>}
                        <button type="submit" className="btn-save">Save Event</button>
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
        <div className="calendar-overlay" onClick={onClose}>
            <div className="calendar-modal" onClick={e => e.stopPropagation()}>
                <header className="calendar-header">
                    <div className="calendar-header-top">
                        <div className="calendar-title-and-nav">
                            <h2>{currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}</h2>
                            <div className="calendar-nav">
                                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>&lt;</button>
                                <button onClick={() => setCurrentDate(new Date())}>Today</button>
                                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>&gt;</button>
                            </div>
                        </div>
                        <button className="close-modal-btn" onClick={onClose}>&times;</button>
                    </div>
                    <div className="calendar-tabs">
                        <button className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>Calendar</button>
                        <button className={`tab-btn ${activeTab === 'agenda' ? 'active' : ''}`} onClick={() => setActiveTab('agenda')}>Agenda &amp; To-Do</button>
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
                                                    <span className="event-time">{event.time}</span>
                                                    <span className="event-title">{event.title}</span>
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
                                                    <span>{new Date(event.date + 'T00:00:00').toLocaleString('default', { month: 'short' })}</span>
                                                </div>
                                                <div className="agenda-item-details">
                                                    <span className="agenda-item-title">{event.title}</span>
                                                    <span className="agenda-item-sub">{event.time || 'All-day'} &middot; {getSubjectName(event.subjectId)}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (<p className="empty-list-message">No upcoming events.</p>)}
                            </div>
                            <div className="agenda-section">
                                <h3>To-Do List</h3>
                                <form onSubmit={handleAddTodo} className="add-todo-form">
                                    <input type="text" value={newTodoText} onChange={e => setNewTodoText(e.target.value)} placeholder="Add a new to-do item..." />
                                    <select value={newTodoSubjectId} onChange={e => setNewTodoSubjectId(e.target.value)}>
                                        <option value="">General</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <button type="submit" className="add-todo-btn liquid-button">+</button>
                                </form>
                                {todos.length > 0 ? (
                                    <ul className="agenda-list todo-list">
                                        {[...todos].sort((a,b) => Number(a.completed) - Number(b.completed)).map(todo => (
                                            <li key={`todo-${todo.id}`} className={`agenda-item todo-item ${todo.completed ? 'completed' : ''}`}>
                                                <input type="checkbox" id={`todo-cb-${todo.id}`} checked={todo.completed} onChange={() => onToggleTodo(todo.id)} />
                                                <label htmlFor={`todo-cb-${todo.id}`} className="custom-checkbox"></label>
                                                <div className="agenda-item-details">
                                                    <span className="agenda-item-title">{todo.text}</span>
                                                    <span className="agenda-item-sub">{getSubjectName(todo.subjectId)}</span>
                                                </div>
                                                <button className="btn-danger-small" onClick={() => onDeleteTodo(todo.id)}>&times;</button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (<p className="empty-list-message">Your to-do list is empty. Add one above!</p>)}
                            </div>
                        </div>
                    )}
                </div>
                <footer className="calendar-footer">
                    <button className="add-event-main-btn liquid-button" onClick={() => onAddOrEditEvent(null)}>+ Add Calendar Event</button>
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
    const [activeTab, setActiveTab] = useState('settings');
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setActiveTab('settings'); // Reset tab on close
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const validThemes: { id: Theme; name: string; }[] = [
        { id: 'liquid-crystal', name: 'Liquid Crystal' },
        { id: 'deep-blue', name: 'Deep Blue' },
        { id: 'neon-green-blue', name: 'Neon Green & Blue' },
        { id: 'neon-pink-purple', name: 'Neon Pink & Purple' },
        { id: 'neon-pink-orange', name: 'Neon Pink & Orange' }
    ];
    
    const handleUserCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUserCreate(newUsername, newPassword);
        setNewUsername('');
        setNewPassword('');
    };

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                <header className="settings-header">
                    <h2>Options</h2>
                    <button className="close-modal-btn" onClick={onClose}>&times;</button>
                </header>
                <div className="settings-tabs">
                    <button className={`settings-tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
                    <button className={`settings-tab-btn ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>Backup & Restore</button>
                     {currentUser?.role === 'admin' && (
                        <button className={`settings-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>User Management</button>
                    )}
                    <button className={`settings-tab-btn ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>About</button>
                </div>
                <div className="settings-content">
                    {activeTab === 'settings' && (
                        <div className="settings-section">
                            <h3>Customization</h3>
                            <div className="setting-item">
                                <label>Font Size</label>
                                <div className="setting-control">
                                    <button className={fontSize === 'small' ? 'active' : ''} onClick={() => onSetFontSize('small')}>Small</button>
                                    <button className={fontSize === 'medium' ? 'active' : ''} onClick={() => onSetFontSize('medium')}>Medium</button>
                                    <button className={fontSize === 'large' ? 'active' : ''} onClick={() => onSetFontSize('large')}>Large</button>
                                </div>
                            </div>
                             <div className="setting-item">
                                <label>Theme</label>
                                <div className="setting-control theme-selector-control">
                                    {validThemes.map(th => (
                                        <button 
                                            key={th.id}
                                            className={`theme-swatch ${th.id} ${theme === th.id ? 'active' : ''}`} 
                                            onClick={() => onSetTheme(th.id)} 
                                            title={th.name}>
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <h3 className="danger-zone-title">Danger Zone</h3>
                             <div className="setting-item">
                                 <label>Clear All Data</label>
                                 <div className="setting-control">
                                     <button className="btn-danger" onClick={onClearData}>
                                        Clear All Subjects, Events &amp; To-Dos
                                     </button>
                                 </div>
                             </div>
                             <p className="setting-note">This will permanently delete all your subjects, chat history, calendar events, and to-do lists. This action cannot be undone.</p>
                        </div>
                    )}
                    {activeTab === 'backup' && (
                        <div className="settings-section">
                            <h3>Backup Current User Data</h3>
                            <p className="setting-note">Save all your subjects, chats, events, and to-dos to a file on your device.</p>
                            <button className="settings-action-btn" onClick={onBackup}>Download Backup File</button>

                            <h3 style={{marginTop: '2rem'}}>Restore Current User Data</h3>
                            <p className="setting-note">Restore your data from a backup file. This will overwrite any current data for your user account.</p>
                            <input type="file" accept=".json" ref={restoreInputRef} style={{display: 'none'}} onChange={onRestore} />
                            <button className="settings-action-btn" onClick={() => restoreInputRef.current?.click()}>Upload Restore File</button>
                        </div>
                    )}
                    {activeTab === 'users' && currentUser?.role === 'admin' && (
                        <div className="settings-section user-management-section">
                            <h3>Create New Student</h3>
                            <form onSubmit={handleUserCreateSubmit} className="user-management-form">
                                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" required />
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" required />
                                <button type="submit" className="liquid-button">Create</button>
                            </form>
                            
                            <h3>Existing Users</h3>
                            <div className="user-list-table-wrapper">
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
                                                        <button className="btn-danger" onClick={() => onUserDelete(user.username)}>Delete</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'about' && (
                        <div className="settings-section">
                            <h3>About Study Master</h3>
                            <p className="setting-note">
                                Study Master is your personal AI-powered study partner, designed to help you understand your course material more effectively.
                                Upload your documents, get summaries, generate flashcards and mind maps, and chat with an AI tutor that's focused on your content.
                            </p>
                            <p className="setting-note" style={{marginTop: '1rem'}}>Version: 2.0.0 (Modern Calendar)</p>
                            <p className="setting-note" style={{marginTop: '1rem'}}>Created by: Muhammadu Muaz</p>
                        </div>
                    )}
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
                <header className="notification-header">
                    <h3>Notifications ({unreadCount})</h3>
                    <button onClick={onClearAll} disabled={notifications.length === 0}>Clear All</button>
                </header>
                <div className="notification-list">
                    {notifications.length > 0 ? (
                        notifications.map(n => (
                            <div key={n.id} className={`notification-item ${n.read ? 'read' : ''}`} onClick={() => onMarkAsRead(n.id)}>
                                <div className="notification-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 17h2v2H2v-2h2v-7c0-4.42 3.58-8 8-8s8 3.58 8 8v7Zm-2 0v-7c0-3.31-2.69-6-6-6s-6 2.69-6 6v7h12Zm-6 5c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2Z"/></svg>
                                </div>
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
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [pastedText, setPastedText] = useState('');
  
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
  const [theme, setTheme] = useState<Theme>('liquid-crystal');
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMobileView, setActiveMobileView] = useState<'chat' | 'tools'>('chat');


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ai = useMemo(() => new GoogleGenAI({ apiKey }), [apiKey]);
  
  // Apply theme and font size to the root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [theme, fontSize]);

  // Load users from localStorage on initial mount
  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem('studymaster_users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      } else {
        // Initialize with default users if none are stored
        const defaultUsers: Credentials[] = [
          { username: 'admin', password: 'admin', role: 'admin' as const },
          { username: 'Nilfa', password: 'Mznil169', role: 'student' as const },
          { username: 'Nimran', password: 'Nimran987654', role: 'student' as const }
        ];
        localStorage.setItem('studymaster_users', JSON.stringify(defaultUsers));
        setUsers(defaultUsers);
      }
    } catch (e) {
      console.error("Failed to load users from localStorage", e);
      const defaultUsers: Credentials[] = [
        { username: 'admin', password: 'admin', role: 'admin' as const },
        { username: 'Nilfa', password: 'Mznil169', role: 'student' as const },
        { username: 'Nimran', password: 'Nimran987654', role: 'student' as const }
      ];
      setUsers(defaultUsers);
    }
    setIsLoadingAuth(false); // Finished checking for users
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
            setTheme(data.settings.theme || 'liquid-crystal');
            setFontSize(data.settings.fontSize || 'medium');
          }
          setActiveSubjectId(restoredSubjects[0]?.id || null);
        } else {
          // If no data, reset the state for the new user
          setSubjects([]);
          setEvents([]);
          setTodos([]);
          setNotifications([]);
          setActiveSubjectId(null);
          setTheme('liquid-crystal');
          setFontSize('medium');
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
                subjects: subjects.map(({ chat, ...rest }) => rest), // Don't save non-serializable chat object
                events,
                todos,
                notifications,
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
      if (!username.trim() || !pass.trim()) {
          alert("Username and password cannot be empty."); return;
      }
      if (users.some(u => u.username === username)) {
          alert("Username already exists."); return;
      }
      const newUser: Credentials = { username, password: pass, role: 'student' };
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('studymaster_users', JSON.stringify(updatedUsers));
  };
  
  const handleDeleteUser = (usernameToDelete: string) => {
      if (usernameToDelete === 'admin') {
          alert("Cannot delete the admin user."); return;
      }
      if (window.confirm(`Are you sure you want to delete user "${usernameToDelete}"? All their data will be lost.`)) {
          const updatedUsers = users.filter(u => u.username !== usernameToDelete);
          setUsers(updatedUsers);
          localStorage.setItem('studymaster_users', JSON.stringify(updatedUsers));
          localStorage.removeItem(`studymaster_data_${usernameToDelete}`);
      }
  };

  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const unreadNotificationCount = notifications.filter(n => !n.read).length;
  
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
  
  const buildChatHistory = (subject: Subject) => {
      const docContext = { role: 'user' as const, parts: buildInitialChatParts(subject) };
      const apiHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = subject.messages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
      return [docContext, ...apiHistory];
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

    const handleUploadClick = () => { fileInputRef.current?.click(); };
    const getBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); });
    const getTextFromImage = async (file: File): Promise<string> => {
        const base64Data = await getBase64(file);
        const imagePart = { inlineData: { data: base64Data.split(',')[1], mimeType: file.type } };
        const textPart = { text: 'Extract all text from the document in this image. Preserve the structure if possible. If there is no text, return an empty string.' };
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [imagePart, textPart] } });
        return response.text;
    };
    const getTextFromPdf = async (file: File): Promise<string> => {
        const base64Data = await getBase64(file);
        const pdfPart = { inlineData: { data: base64Data.split(',')[1], mimeType: 'application/pdf' }};
        const textPart = { text: 'Extract all text from the provided PDF document. Maintain the original structure, including paragraphs and headings, as best as possible. If the document is unreadable or contains no text, return an empty string.' };
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [pdfPart, textPart] }});
        return response.text;
    }
    const getTextAndImagesFromPdf = async (file: File): Promise<{text: string; images: DocumentImage[]}> => {
        const base64Data = await getBase64Util(file);
        const pdfPart = { inlineData: { data: base64Data.split(',')[1], mimeType: 'application/pdf' } };
        const instructionPart = { text: "Analyze the provided PDF and extract its contents into the required JSON format. This includes all text and all meaningful images/diagrams." };
        try {
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: { parts: [instructionPart, pdfPart] }, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { extractedText: { type: Type.STRING }, extractedImages: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, caption: { type: Type.STRING }, imageData: { type: Type.STRING } } } } } } }, });
            const parsedData = JSON.parse(response.text) as ExtractedPdfData;
            if (!parsedData.extractedText || !Array.isArray(parsedData.extractedImages)) throw new Error("Parsed JSON has incorrect structure.");
            const images = (parsedData.extractedImages || []).map((img: { name: string; caption: string; imageData: string }) => ({ name: img.name || 'Untitled Figure', caption: img.caption || '', data: `data:image/png;base64,${img.imageData}` })).filter((img: DocumentImage) => img.data.length > 30);
            return { text: parsedData.extractedText, images };
        } catch (error) {
            console.error("Failed to parse PDF with image extraction, falling back to text-only extraction.", error);
            const textOnly = await getTextFromPdf(file);
            return { text: textOnly, images: [] };
        }
    };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !activeSubject) return;
        const files: File[] = Array.from(e.target.files);
        e.target.value = '';
        setIsProcessingDocument(true);
        for (const file of files) {
            try {
                if (activeSubject.documents.some(d => d.name === file.name)) { alert(`A document named "${file.name}" already exists for this subject. Please rename the file and try again.`); continue; }
                let documentText = ''; 
                let documentImages: DocumentImage[] = [];
                if (file.type.startsWith('image/')) {
                    documentText = await getTextFromImage(file);
                    const base64Data = await getBase64(file);
                    documentImages = [{ name: file.name, data: base64Data, caption: 'Uploaded image' }];
                } else if (file.type === 'application/pdf') {
                    const { text, images } = await getTextAndImagesFromPdf(file);
                    documentText = text; documentImages = images;
                } else if (file.type.startsWith('text/') || file.name.endsWith('.md')) { documentText = await file.text();
                } else { alert(`Unsupported file type: ${file.type || 'unknown'}. Please upload an image, PDF, or text file.`); continue; }
                if (documentText.trim() || documentImages.length > 0) {
                    const newDoc: Document = { name: file.name, content: documentText, images: documentImages };
                    setSubjects(currentSubjects => currentSubjects.map(s => s.id === activeSubjectId ? { ...s, documents: [...s.documents, newDoc] } : s));
                } else { alert(`Could not extract any content from "${file.name}". The file might be empty, corrupted, or unreadable.`); }
            } catch (error) { console.error('Error processing file:', error); alert(`Failed to process the file: ${file.name}.`); }
        }
        setIsProcessingDocument(false);
    };
    const handleRemoveDocument = (docNameToRemove: string) => { if (activeSubject) { const updatedDocs = activeSubject.documents.filter(d => d.name !== docNameToRemove); updateSubject(activeSubject.id, { documents: updatedDocs }); } };
    const handleAddPastedText = () => {
        if (!activeSubject || !pastedText.trim()) return;
        let docName = 'Pasted Content'; 
        let counter = 1;
        while (activeSubject.documents.some(d => d.name === docName)) { docName = `Pasted Content ${++counter}`; }
        const newDoc: Document = { name: docName, content: pastedText.trim(), images: [] };
        updateSubject(activeSubject.id, { documents: [...activeSubject.documents, newDoc] });
        setPastedText('');
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
                            const validThemes: Theme[] = ['liquid-crystal', 'deep-blue', 'neon-green-blue', 'neon-pink-purple', 'neon-pink-orange'];
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
            // The auto-saving useEffect will persist this empty state, but we also remove it directly for good measure.
            localStorage.removeItem(`studymaster_data_${currentUser.username}`);
            setIsSettingsOpen(false); // Close settings modal after clearing
        }
    };

    const renderFeatureContent = () => {
        if (isGeneratingFeature) { return ( <div className="feature-loading-view"> <div className="loading-spinner"></div> <p>Generating {activeFeature}...</p> </div> ); }
        if (!featureContent && activeFeature !== 'figures') { return ( <div className="feature-placeholder"> <h3>Study Tools</h3> <p>Select a feature from the toolbar above to generate insights from your document, or ask a question in the chat.</p> </div> ); }
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
            default: return null;
        }
    };

    const renderSubjectView = () => {
        if (!activeSubject) {
          return ( <div className="welcome-view"> <div className="welcome-content"> <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg> </button> <h2>Welcome to Study Master</h2> <p>Your AI-powered study partner. Select a subject or create a new one to begin.</p> </div> </div> );
        }
        return (
          <div className="subject-view">
            <header className="subject-header">
                <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <h2>{activeSubject.name}</h2>
                <div className="main-view-actions">
                     <div className="notification-bell-wrapper">
                        <button className="notification-bell liquid-button" onClick={() => setIsNotificationCenterOpen(prev => !prev)} title="Notifications">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                            {unreadNotificationCount > 0 && <span className="notification-badge">{unreadNotificationCount}</span>}
                        </button>
                        <NotificationCenter isOpen={isNotificationCenterOpen} notifications={notifications} onClose={() => setIsNotificationCenterOpen(false)} onMarkAsRead={handleMarkNotificationAsRead} onClearAll={handleClearAllNotifications} />
                    </div>
                    <button className="calendar-btn liquid-button" onClick={() => setIsCalendarOpen(true)} title="Open Calendar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </button>
                </div>
            </header>

            {!activeSubject.isDocSaved ? (
              <div className="document-setup-view">
                <div className="document-setup-area">
                    {isProcessingDocument && ( <div className="document-processing-overlay"> <div className="loading-spinner"></div> <p>Analyzing documents, please wait...</p> </div> )}
                    <div className="document-list-container">
                        <h3>Study Materials ({activeSubject.documents.length})</h3>
                        <ul className="document-list">
                            {activeSubject.documents.map(doc => ( <li key={doc.name} className="document-item" title={doc.name}> <span className="doc-icon">📄</span> <span className="doc-name">{doc.name}</span> <span className="doc-size">{(doc.content.length / 1024).toFixed(1)} KB</span> <button className="doc-remove-btn" onClick={() => handleRemoveDocument(doc.name)} title={`Remove ${doc.name}`}>&times;</button> </li> ))}
                            {activeSubject.documents.length === 0 && ( <p className="no-docs-message">No documents added yet. Upload or paste content below to get started.</p> )}
                        </ul>
                    </div>
                    <div className="document-add-container">
                        <div className="document-upload-controls">
                            <button className="upload-btn liquid-button" onClick={handleUploadClick}> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Files </button>
                            <p className="upload-hint">Upload images, PDFs, or text files.</p>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} accept=".txt,.md,text/plain,image/jpeg,image/png,image/webp,.pdf,application/pdf" multiple />
                        </div>
                        <div className="document-paste-controls">
                            <textarea className="document-paste-area" placeholder="Or paste your notes here..." value={pastedText} onChange={(e) => setPastedText(e.target.value)} />
                            <button className="paste-add-btn liquid-button" onClick={handleAddPastedText} disabled={!pastedText.trim()}>Add Pasted Text</button>
                        </div>
                    </div>
                    <button className="save-doc-btn liquid-button" onClick={handleSaveDocument} disabled={activeSubject.documents.length === 0 || isLoading || isProcessingDocument}> {isLoading ? 'Processing...' : `Start Study Session`} </button>
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
                        <div className="chat-messages">
                        {activeSubject.messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.role}`}>
                            <div className="message-content">
                                {msg.role === 'model' && msg.text === '' && isLoading ? ( <div className="loading-dots"> <div></div><div></div><div></div><div></div> </div> ) : ( <div dangerouslySetInnerHTML={{ __html: msg.role === 'model' ? markdownToHtml(msg.text) : msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}} /> )}
                                {msg.sources && msg.sources.length > 0 && ( <div className="message-sources"> <strong>Sources:</strong> <ul> {msg.sources.map((source, i) => ( <li key={i}> <a href={source.uri} target="_blank" rel="noopener noreferrer">{source.title || source.uri}</a> </li> ))} </ul> </div> )}
                            </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                        </div>
                        <form className="chat-input-form" onSubmit={handleSendMessage}>
                            <input type="text" className="chat-input" placeholder={isInternetSearchEnabled ? "Ask a question (with internet search)..." : "Ask a question..."} value={userInput} onChange={(e) => setUserInput(e.target.value)} disabled={isLoading} />
                            <div className="chat-input-actions">
                                <button type="button" className={`internet-toggle-btn liquid-button ${isInternetSearchEnabled ? 'active' : ''}`} onClick={() => setIsInternetSearchEnabled(!isInternetSearchEnabled)} title={isInternetSearchEnabled ? "Disable Internet Search" : "Enable Internet Search"} disabled={isLoading} > <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> </button>
                                <button type="submit" className="send-btn liquid-button" disabled={isLoading || !userInput.trim()}> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> </button>
                            </div>
                        </form>
                    </aside>
                    <main className="feature-display-area">
                      <div className="feature-toolbar">
                          <button className={`feature-btn liquid-button ${activeFeature === 'key-takeaways' ? 'active' : ''}`} onClick={() => handleFeatureRequest('key-takeaways')}>Key Takeaways</button>
                          <button className={`feature-btn liquid-button ${activeFeature === 'summary' ? 'active' : ''}`} onClick={() => handleFeatureRequest('summary')}>Summary</button>
                          <button className={`feature-btn liquid-button ${activeFeature === 'flashcards' ? 'active' : ''}`} onClick={() => handleFeatureRequest('flashcards')}>Flashcards</button>
                          <button className={`feature-btn liquid-button ${activeFeature === 'mind-map' ? 'active' : ''}`} onClick={() => handleFeatureRequest('mind-map')}>Mind Map</button>
                          <button className={`feature-btn liquid-button ${activeFeature === 'figures' ? 'active' : ''}`} onClick={() => handleFeatureRequest('figures')}>Figures</button>
                          <button className={`feature-btn liquid-button ${activeFeature === 'questions' ? 'active' : ''}`} onClick={() => handleFeatureRequest('questions')}>Questions</button>
                          <button className={`feature-btn liquid-button`} onClick={() => setIsDocManagerOpen(true)}>Manage Documents</button>
                          <button className="fullscreen-toggle-btn liquid-button" onClick={() => setIsChatFullscreen(prev => !prev)} title={isChatFullscreen ? "Show Feature Panel" : "Expand Chat"}>
                              {isChatFullscreen ? ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> ) : ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6m-11 5L21 3m-6 12v6h-6m-5-11L3 21"/></svg> )}
                          </button>
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
    return ( <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1a1a1a', color: 'white', fontFamily: 'sans-serif' }}> <h2>Loading Study Master...</h2> </div> );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} error={loginError} />;
  }

  return (
    <>
      {isSidebarOpen && <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
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
        <div className="sidebar-header">
          <h1>Subjects</h1>
          <div className="sidebar-header-actions">
            <button className="add-subject-btn liquid-button" onClick={handleAddSubjectClick} disabled={isAddingSubject}> + Add </button>
          </div>
        </div>
        {isAddingSubject && (
          <form onSubmit={handleCreateSubject} className="add-subject-form">
            <input type="text" className="add-subject-input" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="New subject name..." autoFocus />
            <div className="add-subject-actions">
              <button type="submit" className="btn-save">Save</button>
              <button type="button" className="btn-cancel" onClick={handleCancelAddSubject}>Cancel</button>
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
                <button className="edit-subject-btn liquid-button" onClick={(e) => handleEnableEditing(e, subject.id)} title={`Rename "${subject.name}"`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button className="delete-subject-btn liquid-button" onClick={(e) => handleDeleteSubject(e, subject.id)} title={`Delete "${subject.name}"`}> &times; </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
            <span style={{marginRight: 'auto', color: 'var(--text-secondary)'}}>User: {currentUser.username}</span>
            <button className="settings-btn liquid-button" onClick={handleLogout} title="Logout">Logout</button>
            <button className="settings-btn liquid-button" onClick={() => setIsSettingsOpen(true)} title="Options">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
        </div>
      </aside>
      
      <main className="main-content">
        {renderSubjectView()}
      </main>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
