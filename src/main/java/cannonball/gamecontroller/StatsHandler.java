package cannonball.gamecontroller;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;

public class StatsHandler implements AutoCloseable {
    private File file;
    private FileWriter fileWriter;
    private PrintWriter printWriter;

    public StatsHandler(String id) {
        file = new File("D:/JavaProjects/OOP2/lab1/output/stats" + id + ".txt");
        if (file.exists()) file.delete();
        try {
            file.createNewFile();
            fileWriter = new FileWriter(file, true);
            printWriter = new PrintWriter(fileWriter);
        } catch (IOException e) {
            e.printStackTrace();
            try {
                printWriter.close();
                fileWriter.close();
            } catch (IOException ex) {
                ex.printStackTrace();
            }
        }
    }

    public void updateStats(long width, long height, long fps){
        printWriter.append("width = ").append(String.valueOf(width))
                    .append(", height = ").append(String.valueOf(height))
                    .append(", fps = ").append(String.valueOf(fps)).append("\n");
    }

    @Override
    public void close() {
        try{
            printWriter.close();
            fileWriter.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public File getFile() {
        return file;
    }
}
