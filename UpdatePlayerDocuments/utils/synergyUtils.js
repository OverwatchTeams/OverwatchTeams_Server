async function aggregateSynergy(Match, Player) {
    try {
        // === 시너지 점수 계산 시작 ===
        const ONE_YEAR_AGO = new Date();
        ONE_YEAR_AGO.setFullYear(ONE_YEAR_AGO.getFullYear() - 1);

        // 1년 내 매치 불러오기
        const matches = await Match.find({ date: { $gte: ONE_YEAR_AGO } }).sort({ round: 1, index: 1 });
        // 클랜원만 미리 불러오기
        const clanPlayers = await Player.find({ isClanMember: true });
        const clanPlayerSet = new Set(clanPlayers.map(p => p.player));
        const playerMap = new Map(clanPlayers.map(p => [p.player, p]));

        // 라운드별로 그룹핑
        const rounds = {};
        for (const m of matches) {
            if (!rounds[m.round]) rounds[m.round] = [];
            rounds[m.round].push(m);
        }

        // 시너지 누적용 임시 객체
        // synergyStats[me][you][rolePair].sameTeam/oppositeTeam = { games, wins }
        const synergyStats = {};

        for (const roundMatches of Object.values(rounds)) {
            const teamSize = roundMatches.length / 2;
            const teamA = roundMatches.slice(0, teamSize);
            const teamB = roundMatches.slice(teamSize);

            // 두 팀 모두 처리
            const teams = [teamA, teamB];
            for (let t = 0; t < 2; t++) {
            const myTeam = teams[t], oppTeam = teams[1 - t];
            for (const me of myTeam) {
                if (!clanPlayerSet.has(me.player)) continue;
                for (const you of myTeam) {
                if (me.player === you.player || !clanPlayerSet.has(you.player)) continue;
                // 디버그 로그: 같은 라운드, 같은 팀
                const rolePair = `${me.role}-${you.role}`;
                synergyStats[me.player] ??= {};
                synergyStats[me.player][you.player] ??= {};
                synergyStats[me.player][you.player][rolePair] ??= { sameTeam: { games: 0, wins: 0 }, oppositeTeam: { games: 0, wins: 0 } };
                synergyStats[me.player][you.player][rolePair].sameTeam.games++;
                if (me.winlose === '승' && you.winlose === '승') synergyStats[me.player][you.player][rolePair].sameTeam.wins++;
                }
                for (const you of oppTeam) {
                if (!clanPlayerSet.has(you.player)) continue;
                // 디버그 로그: 같은 라운드, 다른 팀
                const rolePair = `${me.role}-${you.role}`;
                synergyStats[me.player] ??= {};
                synergyStats[me.player][you.player] ??= {};
                synergyStats[me.player][you.player][rolePair] ??= { sameTeam: { games: 0, wins: 0 }, oppositeTeam: { games: 0, wins: 0 } };
                synergyStats[me.player][you.player][rolePair].oppositeTeam.games++;
                if (me.winlose === '승' && you.winlose === '패') synergyStats[me.player][you.player][rolePair].oppositeTeam.wins++;
                }
            }
            }
        }

        // Player synergy 필드 갱신
        for (const [me, youMap] of Object.entries(synergyStats)) {
            const mePlayer = playerMap.get(me);
            if (!mePlayer) continue;
            for (const [you, roleMap] of Object.entries(youMap)) {
            let synergyObj = mePlayer.synergy.get(you) || {};
            for (const [rolePair, { sameTeam, oppositeTeam }] of Object.entries(roleMap)) {
                // 10경기 이상만 score 계산
                if (sameTeam.games >= 10) {
                synergyObj[rolePair] = synergyObj[rolePair] || { sameTeam: {}, oppositeTeam: {} };
                synergyObj[rolePair].sameTeam = {
                    games: sameTeam.games,
                    score: Math.round((sameTeam.wins / sameTeam.games) * 100)
                };
                synergyObj[rolePair].oppositeTeam = {
                    games: oppositeTeam.games,
                    score: oppositeTeam.games ? Math.round((oppositeTeam.wins / oppositeTeam.games) * 100) : 0
                };
                }
            }
            mePlayer.synergy.set(you, synergyObj);
            }
            await mePlayer.save();
        }
        // === 시너지 점수 계산 끝 ===

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'All player data updated successfully.' }),
        };

        } catch (error) {
        console.error('Update failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error updating player data.', error }),
        };
    }
}
module.exports = { aggregateSynergy };
    