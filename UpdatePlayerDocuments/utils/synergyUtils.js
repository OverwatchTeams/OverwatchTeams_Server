async function aggregateSynergy(Match, Player) {
    try {
        // === 시너지 점수 계산 시작 ===
        const ONE_YEAR_AGO = new Date();
        ONE_YEAR_AGO.setFullYear(ONE_YEAR_AGO.getFullYear() - 1);

        // 1년 내 매치 불러오기
        const matches = await Match.find({ date: { $gte: ONE_YEAR_AGO } }).sort({ round: 1, index: 1 });
        
        // 클랜원만 미리 불러오기
        // subNames도 반영
        const clanPlayers = await Player.find({ isClanMember: true });
        const clanPlayerSet = new Set(clanPlayers.flatMap(p => [p.player, ...p.subNames])); // 변경된 부분
        const playerMap = new Map(clanPlayers.flatMap(p => [[p.player, p], ...p.subNames.map(sub => [sub, p])])); // 변경된 부분

        // 라운드별로 그룹핑
        const rounds = {};
        for (const m of matches) {
            if (!rounds[m.round]) rounds[m.round] = [];
            rounds[m.round].push(m);
        }

        // 시너지 누적용 임시 객체
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
                    let myself = playerMap.get(me.player);
                    //같은 팀인경우 시너지 데이터 갱신
                    for (const you of myTeam) {
                        
                        if (!clanPlayerSet.has(you.player)) continue;
                        let yourself = playerMap.get(you.player);
                        if (myself === yourself) continue;
                        const rolePair = `${me.role}-${you.role}`;
                        synergyStats[myself.player] ??= {};
                        synergyStats[myself.player][yourself.player] ??= {};
                        synergyStats[myself.player][yourself.player][rolePair] ??= { sameTeam: { games: 0, wins: 0 }, oppositeTeam: { games: 0, wins: 0 } };
                        synergyStats[myself.player][yourself.player][rolePair].sameTeam.games++;
                        if (me.winlose === '승' && you.winlose === '승') synergyStats[myself.player][yourself.player][rolePair].sameTeam.wins++;
                    }
                    //다른 팀인경우 시너지 데이터 갱신
                    for (const you of oppTeam) {
                        if (!clanPlayerSet.has(you.player)) continue;
                        let yourself = playerMap.get(you.player);
                        const rolePair = `${me.role}-${you.role}`;
                        synergyStats[myself.player] ??= {};
                        synergyStats[myself.player][yourself.player] ??= {};
                        synergyStats[myself.player][yourself.player][rolePair] ??= { sameTeam: { games: 0, wins: 0 }, oppositeTeam: { games: 0, wins: 0 } };
                        synergyStats[myself.player][yourself.player][rolePair].oppositeTeam.games++;
                        if (me.winlose === '승' && you.winlose === '패') synergyStats[myself.player][yourself.player][rolePair].oppositeTeam.wins++;
                    }
                }
            }
        }

        // Player synergy 필드 갱신
        for (const [me, youMap] of Object.entries(synergyStats)) {
            const myself = playerMap.get(me);
            if (!myself) continue;
            for (const [you, roleMap] of Object.entries(youMap)) {
                let synergyObj = myself.synergy.get(you) || {};
                for (const [rolePair, { sameTeam, oppositeTeam }] of Object.entries(roleMap)) {
                    synergyObj[rolePair] = synergyObj[rolePair] || { sameTeam: {}, oppositeTeam: {} };
                    if (sameTeam.games >= 1) {
                        synergyObj[rolePair].sameTeam = {
                            games: sameTeam.games,
                            wins: sameTeam.wins
                        };
                    }
                    else if(oppositeTeam.games >= 1) {
                        synergyObj[rolePair].oppositeTeam = {
                            games: oppositeTeam.games,
                            wins: oppositeTeam.wins
                        };
                    }
                }
                myself.synergy.set(you, synergyObj);
            }
            await myself.save();
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
