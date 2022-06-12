package cannonball.gamecontroller;

import org.junit.Test;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

public class StatsHandlerTest {

    @Test
    public void updateStats() throws IOException {
        StatsHandler handler = new StatsHandler("test");
        handler.updateStats(100, 100, 30);
        handler.close();

        BufferedReader reader = new BufferedReader(new FileReader(handler.getFile()));
        String line = reader.readLine();
        reader.close();
        assertEquals("width = 100, height = 100, fps = 30", line);
    }

    @Test
    public void close() throws IOException {
        StatsHandler handler = new StatsHandler("test");
        handler.close();
        handler.updateStats(100, 100, 30);

        BufferedReader reader = new BufferedReader(new FileReader(handler.getFile()));
        String line = reader.readLine();
        reader.close();
        assertNull(line);
    }
}