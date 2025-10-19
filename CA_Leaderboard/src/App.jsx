import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoized parser to avoid recreation
  const parseMarkdownTable = useCallback((markdown) => {
    const lines = markdown.split("\n");
    const headers = lines[0]
      .split("|")
      .map((h) => h.trim())
      .filter(Boolean);
    
    const hasReferralCode = headers.includes("Referral Code");
    const data = [];

    // Skip header and separator rows
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("|---")) continue;

      const row = line.split("|").map((c) => c.trim()).filter(Boolean);

      if (row.length === headers.length) {
        const rowDict = headers.reduce((acc, header, idx) => {
          acc[header] = row[idx];
          return acc;
        }, {});

        // Skip entries without referral code if required
        if (hasReferralCode && !rowDict["Referral Code"]?.trim()) continue;

        data.push(rowDict);
      }
    }

    return data;
  }, []);

  // Memoized leaderboard calculation
  const calculateLeaderboard = useCallback((parsedData, referralData) => {
    const referralCount = new Map();

    parsedData.forEach((entry) => {
      const code = entry["Referral Code"];
      if (!referralCount.has(code)) {
        const owner = Object.keys(referralData).find(
          (name) => referralData[name] === code
        );
        referralCount.set(code, {
          Name: owner,
          "Referral Code": code,
          "Number of Certifications": 0,
        });
      }
      referralCount.get(code)["Number of Certifications"]++;
    });

    return Array.from(referralCount.values()).sort(
      (a, b) => b["Number of Certifications"] - a["Number of Certifications"]
    );
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch both requests in parallel
        const [markdownRes, referralRes] = await Promise.all([
          axios.get(
            "https://raw.githubusercontent.com/GSSoC24/Postman-Challenge/main/add-your-certificate.md"
          ),
          axios.get("/referral_data.json"),
        ]);

        const parsedData = parseMarkdownTable(markdownRes.data);
        const updatedLeaderboard = calculateLeaderboard(
          parsedData,
          referralRes.data
        );
        setLeaderboard(updatedLeaderboard);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load leaderboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [parseMarkdownTable, calculateLeaderboard]);

  // Memoize rendered rows to prevent unnecessary re-renders
  const leaderboardRows = useMemo(
    () =>
      leaderboard.map((item, index) => (
        <tr key={`${item["Referral Code"]}-${index}`}>
          <td>{index + 1}</td>
          <td>{item["Name"]}</td>
          <td>{item["Referral Code"]}</td>
          <td>{item["Number of Certifications"]}</td>
          <td>{item["Number of Certifications"] * 50}</td>
        </tr>
      )),
    [leaderboard]
  );

  if (loading) return <div className="App">Loading leaderboard...</div>;
  if (error) return <div className="App error">{error}</div>;

  return (
    <div className="App">
      <img src="/logo.png" alt="GirlScript Summer Of Code Logo" />
      <h1>Campus Ambassador Leaderboard</h1>
      <div className="description">
        Get ready to climb the ranks and win big! As a
        <span className="highlight"> GirlScript Summer of Code </span>
        campus ambassador, your influence is invaluable. We're excited to
        introduce the leaderboard, your gateway to exclusive rewards. For every
        successful referral who completes certification and contributes a merged
        PR to the designated Postman Challenge GitHub repo, you earn a whopping
        50 points. The campus ambassador with the highest score will be showered
        with amazing goodies and surprises.
      </div>
      <table id="leaderboardTable">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Referral Code</th>
            <th>Number of Certifications</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>{leaderboardRows}</tbody>
      </table>
      <footer>
        <img src="/footer.png" alt="GirlScript Summer Of Code Logo" />
      </footer>
    </div>
  );
}

export default App;
