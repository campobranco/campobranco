import { NextResponse } from "next/server";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
    try {
        const q = query(collection(db, "addresses"), where("street", "==", "Rua Douradinho"));
        const snap = await getDocs(q);
        return NextResponse.json(snap.docs.map(d => ({id: d.id, ...d.data()})));
    } catch (e: any) {
        return NextResponse.json({error: e.message});
    }
}
