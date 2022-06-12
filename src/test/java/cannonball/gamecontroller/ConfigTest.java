package cannonball.gamecontroller;

import org.json.simple.JSONObject;
import org.junit.Before;
import org.junit.Test;

import static org.junit.Assert.*;

public class ConfigTest {

    private Config config;

    @Before
    public void before(){
        config = new Config();
    }

    @Test
    public void JSONserialize() {
        JSONObject object = config.JSONserialize();
        assertEquals(58.0, object.get("cannonballWeight"));
        assertEquals(9.8, object.get("gravitationalConstant"));
    }

    @Test
    public void getPreSharedKey() {
        assertEquals("gdjhd234erw", config.getPreSharedKey());
    }
}