import statsapi
from datetime import datetime
import json


def get_mlb_data():
    # Get MLB teams
    teams = statsapi.get('teams', {})
    mlb_teams = [
        {
            "id": team["id"],
            "name": team["name"]
        }
        for team in teams["teams"] 
        if team["sport"].get('name', '') == "Major League Baseball"
    ]

    # Define year range
    years = range(2015, datetime.now().year + 1)
    
    # Get every team's roster for all years
    data = []
    for team in mlb_teams:
        for year in years:
            try:
                roster = statsapi.roster(team["id"], rosterType=None, season=year, date=None)
                data.append({
                    "id": team["id"],
                    "name": team["name"],
                    "year": year,
                    "roster": roster.split('\n')
                })
            except:
                print('Could not get roster for team {teamName} in {year}'.format(
                    teamName=team["name"],
                    year=year
                ))

    # Write JSON to file
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=True, indent=4)

    return data


def load_mlb_data():
    with open('data.json', 'r') as f:
        try:
            mlb_data = json.load(f)
        except Exception as error:
            mlb_data = [error]

        return mlb_data
    

def get_unique_players(data):
    players = []
    for team in data:
        for player in team["roster"]:
            player_info = player.split(' ')
            try:
                player_name = " ".join([player_info[-2], player_info[-1]])
            except:
                pass
            if not player_name in players:
                players.append(player_name)
    return players