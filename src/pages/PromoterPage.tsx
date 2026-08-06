import { useState } from "react";
import type { FormEvent } from "react";
import Shell from "../components/Shell";
import { api } from "../api/client";
import VipPackages from "../VipPackages";
import { promoterColor } from "../promoter-theme";

export default function PromoterPage({
  promoterSlug,
  qrToken,
}
