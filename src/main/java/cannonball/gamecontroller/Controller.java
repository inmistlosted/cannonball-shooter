package cannonball.gamecontroller;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;

import javax.websocket.Session;

public class Controller {
    private Session userSession;
    private Config config;
    private StatsHandler statsHandler;

    public Controller(Session userSession){
        this.userSession = userSession;
        this.config = new Config();
        this.statsHandler = new StatsHandler(userSession.getId());
    }

    public boolean initClient() {
        if (userSession == null) return false;
        System.out.println("Starting new session for user " + userSession.toString());
        return true;
    }

    public int handleMessage(String message) throws Exception {
        System.out.println(message);
        JSONParser parser = new JSONParser();
        JSONObject jsonObject = (JSONObject) parser.parse(message);
        long command = (long)jsonObject.get("command");
        if (command == Constants.ClientMessageConstants.INIT_REQUEST){
            startAppClientRequest(jsonObject);
            return 0;
        } else if (command == Constants.ClientMessageConstants.STATS_RESPONSE){
            statsClientResponse(jsonObject);
            return 1;
        } else throw new Exception("Unexpected command type");
    }

    private void statsClientResponse(JSONObject message) {
        JSONObject content = (JSONObject) message.get("content");
        long width = (long)content.get("width");
        long height = (long)content.get("height");
        long fps = (long)content.get("fps");

        statsHandler.updateStats(width, height, fps);
    }

    private void startAppClientRequest(JSONObject request) throws Exception {
        String secretKey = (String) request.get("preSharedKey");
        if(secretKey.compareTo(config.getPreSharedKey()) != 0)
            throw new Exception("Error, invalid secret key: " + config.getPreSharedKey());

        JSONObject jsonObject = new JSONObject();
        jsonObject.put("command", Constants.ServerMessageConstants.INIT_RESPONSE);
        jsonObject.put("content", config.JSONserialize());


        userSession.getBasicRemote().sendText(jsonObject.toJSONString());
    }

    public boolean closeApp() {
        System.out.println("Closing current session");
        return true;
    }
}
