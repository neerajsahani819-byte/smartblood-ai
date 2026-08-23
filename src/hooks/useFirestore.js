// src/hooks/useFirestore.js
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';

// ✅ Helper to ensure ID is a string
const safeId = (id) => {
    if (!id) return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return String(id);
};

export const useFirestoreListener = (collectionName, filters = []) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        const q = collection(db, collectionName);

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const results = [];
                snapshot.forEach(doc => {
                    // ✅ Ensure ID is always a string
                    results.push({
                        id: safeId(doc.id),
                        ...doc.data()
                    });
                });
                setData(results);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Firestore listener error:', err);
                setError(err);
                setLoading(false);

                // Fallback: Try a one-time fetch
                const fetchData = async () => {
                    try {
                        const snapshot = await getDocs(q);
                        const results = [];
                        snapshot.forEach(doc => {
                            // ✅ Ensure ID is always a string
                            results.push({
                                id: safeId(doc.id),
                                ...doc.data()
                            });
                        });
                        setData(results);
                        setError(null);
                    } catch (fetchErr) {
                        console.error('Fallback fetch error:', fetchErr);
                    }
                };
                fetchData();
            }
        );

        return () => unsubscribe();
    }, [collectionName, JSON.stringify(filters)]);

    return { data, loading, error };
};

export default useFirestoreListener;