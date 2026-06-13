export interface UserScore {
  address:          string;
  score:            number;
  swap_count:       number;
  volume_usd:       number;
  consecutive_days: number;
  last_activity:    string;
}

export interface LeaderboardEntry extends UserScore {
  rank:      number;
  tier_name: string;
  tier_id:   number;
}

export interface SwapRecord {
  id:           string;
  user_address: string;
  token_in:     string;
  token_out:    string;
  amount_in:    string;
  amount_out:   string;
  dex:          string;
  tx_hash:      string;
  volume_usd:   number;
  score_earned: number;
  created_at:   string;
}
