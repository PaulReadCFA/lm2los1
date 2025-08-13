import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

/**
 * CFA Institute – Quantitative Methods: LOS 1
 * Interactive learning tool covering:
 * 1) Coupon Bond Cash Flows & Price (semiannual default)
 * 2) Mortgage (Level-Payment) Amortization
 * 3) Dividend Discount Models (no growth, constant growth, two‑stage growth)
 *
 * Tech: React + TailwindCSS + Recharts + Framer Motion
 * Note: Charts now use inline heights so they render even if Tailwind isn't set up yet.
 */

// CFA palette
const CFA = {
  primary: "#4476FF",
  dark: "#06005A",
};

const fmtUSD = (x) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(x);

// ===== Bond Helpers =====
function buildBondCashFlows({ face = 100, years = 5, couponRate = 0.086, ytm = 0.065, freq = 2 }) {
  const n = years * freq;
  const c = (couponRate * face) / freq;
  const r = ytm / freq;
  const flows = [];
  for (let t = 1; t <= n; t++) {
    const cf = t === n ? c + face : c;
    flows.push({ period: t / freq, coupon: c, other: t === n ? face : 0, total: cf });
  }
  const pvCoupons = Array.from({ length: n }, (_, k) => c / Math.pow(1 + r, k + 1)).reduce((a, b) => a + b, 0);
  const pvRedemption = face / Math.pow(1 + r, n);
  const price = pvCoupons + pvRedemption;
  return { flows, price, c, r, n };
}

// ===== Mortgage Helpers =====
function buildMortgageSchedule({ principal = 800000, rate = 0.06, years = 30 }) {
  const m = 12;
  const n = years * m;
  const i = rate / m;
  const pmt = (i * principal) / (1 - Math.pow(1 + i, -n));
  let bal = principal;
  const rows = [];
  for (let t = 1; t <= n; t++) {
    const interest = bal * i;
    const principalPaid = pmt - interest;
    bal -= principalPaid;
    rows.push({ month: t, interest, principal: principalPaid, total: pmt, balance: Math.max(bal, 0) });
  }
  return { rows, pmt };
}

// ===== Dividend Helpers =====
function buildDividendSeries({ D0 = 5, required = 0.1, gConst = 0.05, gShort = 0.05, gLong = 0.03, shortYears = 5, horizonYears = 10 }) {
  const constant = Array.from({ length: horizonYears }, (_, k) => ({ year: k + 1, constDiv: D0 }));
  const constGrowth = [];
  let Dt = D0 * (1 + gConst);
  for (let t = 1; t <= horizonYears; t++) {
    if (t > 1) Dt *= 1 + gConst;
    constGrowth.push({ year: t, constGrow: Dt });
  }
  const twoStage = [];
  Dt = D0 * (1 + gShort);
  for (let t = 1; t <= horizonYears; t++) {
    if (t > 1) {
      const currentG = t <= shortYears ? gShort : gLong;
      Dt *= 1 + currentG;
    }
    twoStage.push({ year: t, twoStage: Dt });
  }
  const data = Array.from({ length: horizonYears }, (_, idx) => ({
    year: idx + 1,
    constDiv: constant[idx].constDiv,
    constGrow: constGrowth[idx].constGrow,
    twoStage: twoStage[idx].twoStage,
  }));
  const priceNoGrowth = D0 / required;
  const priceGordon = gConst < required ? (D0 * (1 + gConst)) / (required - gConst) : NaN;
  const cf1 = Array.from({ length: shortYears }, (_, k) => (D0 * Math.pow(1 + gShort, k + 1)) / Math.pow(1 + required, k + 1)).reduce((a, b) => a + b, 0);
  const D_T1 = D0 * Math.pow(1 + gShort, shortYears) * (1 + gLong);
  const TV = gLong < required ? D_T1 / (required - gLong) : NaN;
  const pvTV = TV / Math.pow(1 + required, shortYears);
  const priceTwoStage = cf1 + pvTV;
  return { data, priceNoGrowth, priceGordon, priceTwoStage };
}

function NumberInput({ label, value, onChange, step = 0.01, min, max, suffix = "" }) {
  return (
    <label className="flex items-center justify-between gap-4 py-1">
      <span className="text-sm text-gray-700 font-[Arial]">{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-40 rounded-2xl border px-3 py-2 text-right font-[Arial] shadow-sm focus:outline-none focus:ring-2"
      />
      {suffix && <span className="w-10 text-right text-sm text-gray-500">{suffix}</span>}
    </label>
  );
}

function PercentInput(props) {
  return (
    <NumberInput
      {...props}
      step={0.01}
      min={0}
      max={100}
      suffix="%"
      onChange={(v) => props.onChange(v / 100)}
      value={Math.round(((props.value ?? 0) * 100 + Number.EPSILON) * 100) / 100}
    />
  );
}

export default function App() {
  // Bond state
  const [couponRate, setCouponRate] = useState(0.086);
  const [ytm, setYtm] = useState(0.065);
  const [years, setYears] = useState(5);
  const [freq, setFreq] = useState(2);
  const bond = useMemo(() => buildBondCashFlows({ face: 100, years, couponRate, ytm, freq }), [years, couponRate, ytm, freq]);

  // Mortgage state
  const [mortgageAmt, setMortgageAmt] = useState(800000);
  const [mortgageRate, setMortgageRate] = useState(0.06);
  const [mortgageYears, setMortgageYears] = useState(30);
  const mortgage = useMemo(() => buildMortgageSchedule({ principal: mortgageAmt, rate: mortgageRate, years: mortgageYears }), [mortgageAmt, mortgageRate, mortgageYears]);

  // Dividend state
  const [D0, setD0] = useState(5);
  const [req, setReq] = useState(0.1);
  const [gConst, setGConst] = useState(0.05);
  const [gShort, setGShort] = useState(0.05);
  const [gLong, setGLong] = useState(0.03);
  const [shortYears, setShortYears] = useState(5);
  const divs = useMemo(() => buildDividendSeries({ D0, required: req, gConst, gShort, gLong, shortYears, horizonYears: 10 }), [D0, req, gConst, gShort, gLong, shortYears]);

  const mortgageChart = useMemo(() => mortgage.rows.slice(0, 120), [mortgage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold tracking-tight font-[Georgia]" style={{ color: CFA.dark }}>
            Quantitative Methods — LOS 1: Cash Flows & PV Models
          </motion.h1>
          <p className="text-sm text-gray-600 mt-1 font-[Arial]">Explore how input rates shape cash flows and values for bonds, mortgages, and dividend-paying equity.</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">
        {/* Bond Module */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-semibold mb-4 font-[Georgia]" style={{ color: CFA.dark }}>1) Coupon Bond Cash Flows (Face $100)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1">
              <div className="rounded-2xl border p-4 bg-gray-50">
                <h3 className="font-semibold mb-2 font-[Georgia]" style={{ color: CFA.primary }}>Inputs</h3>
                <PercentInput label="Coupon Rate (annual)" value={couponRate} onChange={setCouponRate} />
                <PercentInput label="Yield to Maturity (annual)" value={ytm} onChange={setYtm} />
                <NumberInput label="Years to Maturity" value={years} min={1} max={50} step={1} onChange={setYears} />
                <NumberInput label="Payments / Year" value={freq} min={1} max={12} step={1} onChange={setFreq} />
                <div className="mt-4 text-sm text-gray-700 font-[Arial]">
                  <p><strong>Price:</strong> {fmtUSD(bond.price)} (PV of coupons + redemption)</p>
                  <p><strong>Coupon/period:</strong> {fmtUSD(bond.c)} | <strong>Yield/period:</strong> {(bond.r * 100).toFixed(3)}%</p>
                </div>
              </div>
            </div>

            {/* Chart with inline height so it renders without Tailwind */}
            <div className="col-span-2">
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ period: 0, coupon: 0, other: -bond.price }, ...bond.flows]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" label={{ value: "Years", position: "insideBottom", offset: -4 }} />
                    <YAxis tickFormatter={fmtUSD} />
                    <Tooltip formatter={(v) => fmtUSD(v)} />
                    <Legend />
                    <Bar dataKey="coupon" name="Coupon Cash Flows" fill={CFA.primary} />
                    <Bar dataKey="other" name="Principal/Price" fill={CFA.dark} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-600 mt-2 font-[Arial]">Negative bar at t=0 reflects the bond <em>price</em> (PV). Final period shows coupon + redemption.</p>
            </div>
          </div>
        </section>

        {/* Mortgage Module */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-semibold mb-4 font-[Georgia]" style={{ color: CFA.dark }}>2) Mortgage Amortization (Level Payment)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1">
              <div className="rounded-2xl border p-4 bg-gray-50">
                <h3 className="font-semibold mb-2 font-[Georgia]" style={{ color: CFA.primary }}>Inputs</h3>
                <NumberInput label="Mortgage Amount ($)" value={mortgageAmt} min={10000} step={1000} onChange={setMortgageAmt} />
                <PercentInput label="Annual Rate" value={mortgageRate} onChange={setMortgageRate} />
                <NumberInput label="Term (years)" value={mortgageYears} min={1} max={40} step={1} onChange={setMortgageYears} />
                <div className="mt-4 text-sm text-gray-700 font-[Arial]"><p><strong>Level Payment:</strong> {fmtUSD(mortgage.pmt)} / month</p></div>
              </div>
            </div>

            <div className="col-span-2">
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mortgageChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" label={{ value: "Months (first 120 shown)", position: "insideBottom", offset: -4 }} />
                    <YAxis tickFormatter={fmtUSD} />
                    <Tooltip formatter={(v) => fmtUSD(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="interest" name="Interest" fill={CFA.primary} stroke={CFA.primary} opacity={0.8} />
                    <Area type="monotone" dataKey="principal" name="Principal" fill={CFA.dark} stroke={CFA.dark} opacity={0.7} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-600 mt-2 font-[Arial]">Early payments are interest‑heavy; principal share grows over time. Total payment remains constant.</p>
            </div>
          </div>
        </section>

        {/* Dividends Module */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-semibold mb-4 font-[Georgia]" style={{ color: CFA.dark }}>3) Dividend Discount Models</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1">
              <div className="rounded-2xl border p-4 bg-gray-50">
                <h3 className="font-semibold mb-2 font-[Georgia]" style={{ color: CFA.primary }}>Inputs</h3>
                <NumberInput label="Current Dividend, D₀ ($)" value={D0} min={0} step={0.1} onChange={setD0} />
                <PercentInput label="Required Return (r)" value={req} onChange={setReq} />
                <PercentInput label="Constant Growth g" value={gConst} onChange={setGConst} />
                <PercentInput label="Short‑Term g₁" value={gShort} onChange={setGShort} />
                <PercentInput label="Long‑Term g₂" value={gLong} onChange={setGLong} />
                <NumberInput label="Short‑Term Years (T)" value={shortYears} min={1} max={20} step={1} onChange={setShortYears} />
                <div className="mt-4 text-sm text-gray-700 font-[Arial] space-y-1">
                  <p><strong>No‑growth price:</strong> {fmtUSD(divs.priceNoGrowth)}</p>
                  <p><strong>Gordon price:</strong> {isNaN(divs.priceGordon) ? "g ≥ r (undefined)" : fmtUSD(divs.priceGordon)}</p>
                  <p><strong>Two‑stage price:</strong> {isNaN(divs.priceTwoStage) ? "g₂ ≥ r (undefined)" : fmtUSD(divs.priceTwoStage)}</p>
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={divs.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" label={{ value: "Years (first 10)", position: "insideBottom", offset: -4 }} />
                    <YAxis tickFormatter={fmtUSD} />
                    <Tooltip formatter={(v) => fmtUSD(v)} />
                    <Legend />
                    <Bar dataKey="constDiv" name="Constant Dividend" fill={CFA.dark} />
                    <Bar dataKey="constGrow" name="Constant Growth" fill={CFA.primary} />
                    <Bar dataKey="twoStage" name="Two‑Stage Growth" fill="#9CA3AF" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-600 mt-2 font-[Arial]">Cash flow comparison for three dividend assumptions. Valuations shown at left use standard DDM formulae.</p>
            </div>
          </div>
        </section>

        {/* Publish & Embed Hints */}
        <section className="text-sm text-gray-600 font-[Arial]">
          <h3 className="font-semibold font-[Georgia]" style={{ color: CFA.dark }}>Publish & Embed</h3>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Initialize: <code>git init</code>, <code>git add .</code>, <code>git commit -m "init"</code></li>
            <li>Connect to GitHub: <code>git remote add origin https://github.com/PaulReadCFA/cfa-quant-los1.git</code> (use your repo)</li>
            <li>Push: <code>git branch -M main</code>, <code>git push -u origin main</code></li>
            <li>Vercel: import the repo → Framework preset: <strong>Vite</strong> → Build: <code>npm run build</code> → Output: <code>dist</code></li>
            <li>Canvas embed: <pre className="bg-gray-100 p-2 rounded-md overflow-x-auto">{`<iframe src="https://your-vercel-site.vercel.app" width="100%" height="720" style="border:none"></iframe>`}</pre></li>
          </ol>
        </section>
      </main>
    </div>
  );
}
