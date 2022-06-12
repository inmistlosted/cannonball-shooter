package cannonball.gamecontroller;

import org.json.simple.JSONObject;

public class Config {
    private final String preSharedKey = "gdjhd234erw";
    private final double cannonballRadius = 0.6;
    private final double cannonballWeight = 58;
    private final int cannonballSpeed = 19;
    private final int tick = 13;
    private final double gravitationalConstant = 9.8;

    JSONObject JSONserialize(){
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("cannonballRadius", cannonballRadius);
        jsonObject.put("cannonballWeight", cannonballWeight);
        jsonObject.put("cannonballSpeed", cannonballSpeed);
        jsonObject.put("tick", tick);
        jsonObject.put("gravitationalConstant", gravitationalConstant);

        return jsonObject;
    }

    public String getPreSharedKey() {
        return preSharedKey;
    }
}
