using UnityEngine;
using UnityEngine.Events;
using UnityEngine.Networking;
using System.Collections.Generic;

public class AwsLambdaClient
{
    #if UNITY_EDITOR
      public const string GATEWAY_URL = "http://localhost:3003";
    #else
      public const string GATEWAY_URL = "https://api.vellymon.game";
    #endif

    public static void SendCreateGameRequest(bool isPriv, string username, string pass, UnityAction<string, string, int> callback, UnityAction<string> reject)
    {
        UnityWebRequest www = UnityWebRequest.Post(GATEWAY_URL + "/game", new Dictionary<string,string>(){
            {"playerId", username},
            {"isPrivate", isPriv.ToString()},
            {"password", pass}
        });
        www.SendWebRequest().completed += (op) => CreateGameResponse(www, callback, reject);
    }

    private static void CreateGameResponse(UnityWebRequest www, UnityAction<string, string, int> callback, UnityAction<string> reject)
    {
        if (www.result == UnityWebRequest.Result.ConnectionError || www.result == UnityWebRequest.Result.ProtocolError)
        {
            reject("Error creating new game: \n" + www.downloadHandler.text);
        }
        else
        {
            CreateGameResponse res = JsonUtility.FromJson<CreateGameResponse>(www.downloadHandler.text);
            callback(res.playerSessionId, res.ipAddress, res.port);
        }
        www.Dispose();
    }

    public static void SendJoinGameRequest(string gId, string username, string pass, UnityAction<string, string, int> callback, UnityAction<string> reject)
    {
        UnityWebRequest www = UnityWebRequest.Post(GATEWAY_URL + "/join", new Dictionary<string,string>(){
            {"playerId", username},
            {"gameSessionId",gId},
            {"password", pass}
        });
        www.SendWebRequest().completed += (op) => JoinGameResponse(www, callback, reject);
    }

    private static void JoinGameResponse(UnityWebRequest www, UnityAction<string, string, int> callback, UnityAction<string> reject)
    {
        if (www.result == UnityWebRequest.Result.ConnectionError || www.result == UnityWebRequest.Result.ProtocolError)
        {
            reject("Error joining game: \n" + www.downloadHandler.text);
        }
        else
        {
            JoinGameResponse res = JsonUtility.FromJson<JoinGameResponse>(www.downloadHandler.text);
            callback(res.playerSessionId, res.ipAddress, res.port);
        }
        www.Dispose();
    }

    public static void SendFindAvailableGamesRequest(UnityAction<GameView[]> callback, UnityAction<string> reject)
    {
        UnityWebRequest www = UnityWebRequest.Get(GATEWAY_URL + "/games");
        www.SendWebRequest().completed += (op) => FindAvailableGamesResponse(www, callback, reject);
    }

    private static void FindAvailableGamesResponse(UnityWebRequest www, UnityAction<GameView[]> callback, UnityAction<string> reject)
    {
        if (www.result == UnityWebRequest.Result.ConnectionError || www.result == UnityWebRequest.Result.ProtocolError)
        {
            reject("Error finding available games: \n" + www.downloadHandler.text);
        }
        else
        {
            GetGamesResponse res = JsonUtility.FromJson<GetGamesResponse>(www.downloadHandler.text);
            callback(res.gameViews);
        }
        www.Dispose();
    }
}
