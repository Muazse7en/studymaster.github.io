// src/FirebaseSandbox.tsx
import React, { useEffect, useState, FormEvent } from "react";
import { auth, db, googleProvider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
} from "firebase/firestore";

type Note = { id: string; text: string; createdAt?: any };

export default function FirebaseSandbox() {
  const [user, setUser] = useState<User | null>(null);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);

  // Track auth state
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Live notes for this user
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }
    const q = query(
      collection(db, "users", user.uid, "notes"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return unsub;
  }, [user]);

  const handleSignIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const addNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !note.trim()) return;
    await addDoc(collection(db, "users", user.uid, "notes"), {
      text: note.trim(),
      createdAt: serverTimestamp(),
    });
    setNote("");
  };

  const removeNote = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "notes", id));
  };

  return (
    <div style={{ maxWidth: 560, margin: "32px auto", fontFamily: "Inter, system-ui, Arial" }}>
      <h1>Firebase Sandbox</h1>

      {!user ? (
        <>
          <p>Sign in to sync notes across devices.</p>
          <button onClick={handleSignIn}>Sign in with Google</button>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={user.photoURL ?? ""}
              alt=""
              width="36"
              height="36"
              style={{ borderRadius: 9999 }}
              onError={(e) => ((e.currentTarget.style.display = "none"))}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{user.displayName ?? "User"}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{user.email}</div>
            </div>
            <button onClick={handleSignOut}>Sign out</button>
          </div>

          <form onSubmit={addNote} style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a note…"
              style={{ flex: 1, padding: 8 }}
            />
            <button type="submit">Add</button>
          </form>

          <ul style={{ marginTop: 16, padding: 0, listStyle: "none" }}>
            {notes.map((n) => (
              <li
                key={n.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  border: "1px solid #e5e7eb",
                  marginBottom: 8,
                  borderRadius: 8,
                }}
              >
                <span>{n.text}</span>
                <button onClick={() => removeNote(n.id)} aria-label="Delete">
                  ✕
                </button>
              </li>
            ))}
            {user && notes.length === 0 && (
              <li style={{ opacity: 0.6 }}>No notes yet — add one!</li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
