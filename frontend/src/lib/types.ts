export type Role = "citizen" | "notary" | "admin" | "super_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  locale: "en" | "fr";
  status: "pending_verification" | "active" | "suspended";
  kyc_status: "not_started" | "pending" | "verified" | "rejected";
  subscription: {
    plan: "monthly" | "quarterly" | "annual" | null;
    status: "active" | "expired" | "none";
    started_at: string | null;
    expires_at: string | null;
  };
  created_at: string;
}

export interface GeoJSONGeometry {
  type: "Point" | "Polygon";
  coordinates: number[] | number[][][];
}

export interface Listing {
  is_for_sale: boolean;
  price_xaf?: number | null;
  listed_at?: string | null;
  expires_at?: string | null;
  status: "none" | "active" | "expired";
}

export interface Parcel {
  id: string;
  parcel_reference: string;
  geojson?: GeoJSONGeometry;
  region: string;
  area_sqm?: number;
  current_owner_id?: string;
  blockchain_tx_hash?: string | null;
  record_hash?: string | null;
  status: "active" | "disputed" | "flagged";
  listing?: Listing;
  registration_date?: string;
  created_at?: string;
  transactions?: TransactionRecord[];
  document_list?: DocumentRecord[];
}

export interface TransactionRecord {
  id: string;
  parcel_id: string;
  from_owner_id: string | null;
  to_owner_id: string;
  type: "registration" | "sale" | "transfer";
  blockchain_tx_hash: string | null;
  status: "pending" | "completed" | "rejected";
  timestamp: string;
}

export interface DocumentRecord {
  id: string;
  parcel_id: string | null;
  file_url: string;
  doc_type: string;
  ai_verification_result: {
    score: number;
    verdict: "authentic" | "suspicious" | "fraudulent";
    flagged_reasons: string[];
    user_message?: string;
  } | null;
  human_review_status: "not_required" | "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Payment {
  id: string;
  type: "subscription" | "listing_fee";
  related_id: string;
  amount_xaf: number;
  fapshi_trans_id: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED";
  created_at: string;
}

export interface Dispute {
  id: string;
  parcel_id: string;
  parcel_reference?: string;
  description?: string;
  status: "open" | "under_review" | "resolved" | "rejected";
  resolution_notes?: string | null;
  created_at: string;
}

export interface PlanInfo {
  plan: "monthly" | "quarterly" | "annual";
  duration_days: number;
  price_xaf: number;
}

export interface QuickVerifyResult {
  found: boolean;
  parcel_reference: string;
  status: "active" | "disputed" | "flagged" | "not_found";
  region?: string;
  registration_year?: number | null;
}

export interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}
